#!/usr/bin/env python

# Copyright (c) 2015-2017 Enzien Audio, Ltd. (info@enzienaudio.com)
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

import argparse
import base64
import datetime
import getpass
import json
import os
import shutil
import stat
import sys
import tempfile
import time
import urlparse
import zipfile

import requests

class Colours:
    purple = "\033[95m"
    cyan = "\033[96m"
    dark_cyan = "\033[36m"
    blue = "\033[94m"
    green = "\033[92m"
    yellow = "\033[93m"
    red = "\033[91m"
    bold = "\033[1m"
    underline = "\033[4m"
    end = "\033[0m"

class ErrorCodes(object):
    # NOTE(mhroth): this class could inherit from Enum, but we choose not to
    # as to not require an additional dependency
    # http://www.tldp.org/LDP/abs/html/exitcodes.html
    # http://stackoverflow.com/questions/1101957/are-there-any-standard-exit-status-codes-in-linux
    CODE_OK = 0 # success!
    CODE_MAIN_NOT_FOUND = 3 # _main.pd not found
    CODE_HEAVY_COMPILE_ERRORS = 4 # heavy returned compiler errors
    CODE_UPLOAD_ASSET_TOO_LARGE = 5 # the size of the uploadable asset is too large
    CODE_RELEASE_NOT_AVAILABLE = 6 # the requested release is not available
    CODE_CONNECTION_ERROR = 7 # HTTPS connection could not be made to the server
    CODE_CONNECTION_TIMEOUT = 8 # HTTPS connection has timed out
    CODE_CONNECTION_400_500 = 9 # a 400 or 500 error has occured
    CODE_INVALID_TOKEN = 10 # the user token could not be parsed
    CODE_NEW_PATCH_FAIL = 11 # a new patch could not be made
    CODE_EXCEPTION = 125 # a generic execption has occurred

class UploaderException(Exception):
    def __init__(self, code, message=None, e=None):
        self.code = code
        self.message = message
        self.e = e

# the maxmimum file upload size of 1MB
__HV_MAX_UPLOAD_SIZE = 1 * 1024*1024

__HV_UPLOADER_SERVICE_TOKEN = \
    "eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9." \
    "eyJzdGFydERhdGUiOiAiMjAxNi0xMi0xNVQyMzoyNToxMC4wOTU2MjIiLCAic2VydmljZSI6ICJoZWF2eV91cGxvYWRlciJ9." \
    "w2o1_RttJUAiq6WyN0J7MhDsaSseISzgDAQ9aP9Di6M="

__SUPPORTED_GENERATOR_SET = {
    "c-src",
    "bela-linux-armv7a",
    "web-local", "web-js",
    "fabric-src", "fabric-macos-x64", "fabric-win-x86", "fabric-win-x64", "fabric-linux-x64", "fabric-android-armv7a",
    "unity-src", "unity-macos-x64", "unity-win-x86", "unity-win-x64", "unity-linux-x64", "unity-android-armv7a",
    "wwise-src", "wwise-macos-x64", "wwise-win-x86", "wwise-win-x64",  "wwise-linux-x64", "wwise-ios-armv7a"
    "vst2-src", "vst2-macos-x64", "vst2-win-x86", "vst2-win-x64", "vst2-linux-x64"
}

def __zip_dir(in_dir, zip_path, file_filter=None):
    """ Recursively zip an entire directory with an optional file filter
    """
    zf = zipfile.ZipFile(zip_path, mode="w", compression=zipfile.ZIP_DEFLATED)
    for subdir, dirs, files in os.walk(in_dir):
        for f in files:
            if (file_filter is None) or (f.lower().split(".")[-1] in file_filter):
                zf.write(
                    filename=os.path.join(subdir,f),
                    arcname=os.path.relpath(os.path.join(subdir,f), start=in_dir))
    return zip_path

def __unzip(zip_path, target_dir):
    """ Unzip a file to a given directory. All destination files are overwritten.
    """
    zipfile.ZipFile(zip_path).extractall(target_dir)

def __get_file_url_stub_for_generator(json_api, g):
    """ Returns the file link for a specific generator.
        Returns None if no link could be found.
    """
    for i in json_api["included"]:
        if (i["type"] == "file") and (g == i["data"]["buildId"]):
            return i["links"]["self"]
    return None # by default, return None



def upload(input_dir, output_dirs=None, name=None, owner=None, generators=None, b=False, y=False, release=None, release_override=False, domain=None, verbose=False, token=None, clear_token=False, service_token=None, force_new_patch=False):
    """ Upload a directory to the Heavy Cloud Service.

        Parameters
        ----------
        input_dir : str
            Directory containing _main.pd file.

        output_dirs : list, optional
            List of directories where the output should be placed. Usually the output directory list has only one element.
            If no argument is given, the input directory will be used.

        name : str, optional
            The name of the patch.
            If no argument is given, the name "heavy" is used.

        owner : str, optional
            The name of the owner of the patch. Usually this is an organisation.
            If no argument is given, the submitting user name is used.

        generators : list, optional
            A list of generators e.g. 'c', 'unity', or 'vst2-x86'

        b : bool, optional
            If True, puts the results of each generator into its own directory.
            False by default in which case all files are put into the same directory.

        y : bool, optional
            If True, extract only generated C files, static files are deleted. False by default.

        release : str, optional
            The name of the release to use for compiling.

        release_override : bool, optional
            Disable the validity check for a requested release. Forces sending a
            release request to the server.

        verbose : bool, optional
            False by default.

        token : str, optional
            The token used to identify the user to Heavy Cloud Service.
            By default the stored token will be used.

        clear_token : bool, optional
            Clears and ignores any existing stored tokens. Requests a new one from the command line.

        service_token : str, optional
            Pass an optional service token to be used instead of the default heavy_uploader.

        force_new_patch : bool, optional
            Indicate that a new patch should be created with the given name, if it does not yet exist.
    """
    # https://github.com/numpy/numpy/blob/master/doc/HOWTO_DOCUMENT.rst.txt

    try:
        # set default values
        name = name or "heavy"
        domain = domain or "https://enzienaudio.com"
        exit_code = ErrorCodes.CODE_OK
        reply_json = {}
        temp_dir = None
        post_data = {}

        # token should be stored in ~/.heavy/token
        token_path = os.path.expanduser(os.path.join("~/", ".heavy", "token"))

        if token is None:
            if os.path.exists(token_path):
                if clear_token:
                    os.remove(token_path)
                else:
                    with open(token_path, "r") as f:
                        token = f.read()

            if token is None:
                print "Please provide a user token from enzienaudio.com. " \
                "Create or copy one from https://enzienaudio.com/getmytokens/."
                token = getpass.getpass("Enter user token: ")

                # write token to file
                if not os.path.exists(os.path.dirname(token_path)):
                    # ensure that the .heavy directory exists
                    os.makedirs(os.path.dirname(token_path))
                with open(token_path, "w") as f:
                    f.write(token)
                os.chmod(token_path, stat.S_IRUSR | stat.S_IWUSR) # force rw------- permissions on the file

        tick = time.time()

        # check the validity of the token
        try:
            # check the valifity of the token
            payload = json.loads(base64.urlsafe_b64decode(token.split(".")[1]))
            payload["startDate"] = datetime.datetime.strptime(payload["startDate"], "%Y-%m-%dT%H:%M:%S.%f")

            # ensure that the token is valid
            now = datetime.datetime.utcnow()
            assert payload["startDate"] <= now

            if owner is None:
                # if an owner is not supplied, default to the user name in the token
                owner = payload["name"]
        except Exception as e:
            print "The user token is invalid. Generate a new one at https://enzienaudio.com/h/<username>/settings/."
            exit_code = ErrorCodes.CODE_INVALID_TOKEN
            raise e

        # if there is a user-supplied service token, do a basic validity check
        if service_token:
            try:
                # check the valifity of the token
                payload = json.loads(base64.urlsafe_b64decode(token.split(".")[1]))
                payload["startDate"] = datetime.datetime.strptime(payload["startDate"], "%Y-%m-%dT%H:%M:%S.%f")

                # ensure that the token is valid
                now = datetime.datetime.utcnow()
                assert payload["startDate"] <= now

                assert "service" in payload, "'service' field required in service token payload."
            except Exception as e:
                print "The supplied service token is invalid. A default token will be used."
                service_token = __HV_UPLOADER_SERVICE_TOKEN
        else:
            service_token = __HV_UPLOADER_SERVICE_TOKEN

        # create the session to pool all requests
        s = requests.Session()

        # parse the optional release argument
        if release:
            if not release_override:
                # check the validity of the current release
                releases_json = s.get(urlparse.urljoin(domain, "/a/releases/")).json()
                if release in releases_json:
                    today = datetime.datetime.now()
                    valid_until = datetime.datetime.strptime(releases_json[release]["validUntil"], "%Y-%m-%d")
                    if today > valid_until:
                        print "{0}Warning:{1} The release \"{2}\" expired on {3}. It may be removed at any time!".format(
                            Colours.yellow, Colours.end,
                            release,
                            releases_json[release]["validUntil"])
                    elif (valid_until - today) <= datetime.timedelta(weeks=4):
                        print "{0}Warning:{1} The release \"{2}\" will expire soon on {3}.".format(
                            Colours.yellow, Colours.end,
                            release,
                            releases_json[release]["validUntil"])
                else:
                    print "{0}Error:{1} The release \"{2}\" is not available. Available releases are:".format(
                        Colours.red, Colours.end,
                        release)
                    for k,v in releases_json.items():
                        print "* {0} ({1})".format(
                            k,
                            v["releaseDate"])
                    raise UploaderException(ErrorCodes.CODE_RELEASE_NOT_AVAILABLE)

            post_data["release"] = release

        # make a temporary directory
        temp_dir = tempfile.mkdtemp(prefix="lroyal-")

        # zip up the pd directory into the temporary directory
        if not os.path.exists(os.path.join(input_dir, "_main.pd")):
            raise UploaderException(
                ErrorCodes.CODE_MAIN_NOT_FOUND,
                "Root Pd directory does not contain a file named _main.pd.")
        zip_path = __zip_dir(
            input_dir,
            os.path.join(temp_dir, "archive.zip"),
            file_filter={"pd"})
        if os.stat(zip_path).st_size > __HV_MAX_UPLOAD_SIZE:
            raise UploaderException(
                ErrorCodes.CODE_UPLOAD_ASSET_TOO_LARGE,
                "The target directory, zipped, is {0} bytes. The maximum upload size of 1MB.".format(
                    os.stat(zip_path).st_size))

        # the outputs to generate
        generators = list({s.lower() for s in set(generators or [])} & __SUPPORTED_GENERATOR_SET)

        # check if the patch exists already. Ask to create it if it doesn't exist
        r = s.get(
            urlparse.urljoin(domain, "/a/patches/{0}/{1}/".format(owner, name)),
            headers={
                "Accept": "application/json",
                "Authorization": "Bearer " + token,
                "X-Heavy-Service-Token": service_token
            })
        r.raise_for_status()
        reply_json = r.json()
        if "errors" in reply_json:
            if reply_json["errors"][0]["status"] == "404":
                # the patch does not exist
                if force_new_patch:
                    create_new_patch = True
                else:
                    create_new_patch = raw_input("A patch called \"{0}\" does not exist for owner \"{1}\". Create it? (y/n):".format(name, owner))
                    create_new_patch = (create_new_patch == "y")
                if create_new_patch:
                    r = s.post(
                        urlparse.urljoin(domain, "/a/patches/"),
                        data={"owner_name":owner, "name":name, "public":"true"},
                        headers={
                            "Accept": "application/json",
                            "Authorization": "Bearer " + token,
                            "X-Heavy-Service-Token": service_token
                        })
                    r.raise_for_status()
                    reply_json = r.json()
                    if "errors" in reply_json:
                        raise UploaderException(
                            ErrorCodes.CODE_NEW_PATCH_FAIL,
                            reply_json["errors"][0]["detail"])
                    else:
                        pass # no errors? everything is cool! Proceed.
                else:
                    UploaderException(
                        ErrorCodes.CODE_NEW_PATCH_FAIL,
                        "A patch called \"{0}\" does not exist for owner \"{1}\"".format(owner, name))
            else:
                raise UploaderException(
                    ErrorCodes.CODE_NEW_PATCH_FAIL,
                    reply_json["errors"][0]["detail"])
        else:
            pass # the patch exists, move on

        # upload the job, get the response back
        r = s.post(
            urlparse.urljoin(domain, "/a/patches/{0}/{1}/jobs/".format(owner, name)),
            data=post_data,
            headers={
                "Accept": "application/json",
                "Authorization": "Bearer " + token,
                "X-Heavy-Service-Token": service_token
            },
            timeout=None, # some builds can take a very long time
            files={"file": (os.path.basename(zip_path), open(zip_path, "rb"), "application/zip")})
        r.raise_for_status()

        # decode the JSON API response (See below for an example response)
        reply_json = r.json()
        if verbose:
            print json.dumps(reply_json, sort_keys=True, indent=2, separators=(",", ": "))

        # print any warnings
        for i,x in enumerate(reply_json.get("warnings",[])):
            print "{3}) {0}Warning:{1} {2}".format(
                Colours.yellow, Colours.end, x["detail"], i+1)

        # check for errors
        if len(reply_json.get("errors",[])) > 0:
            for i,x in enumerate(reply_json["errors"]):
                print "{3}) {0}Error:{1} {2}".format(
                    Colours.red, Colours.end, x["detail"], i+1)
            raise UploaderException(ErrorCodes.CODE_HEAVY_COMPILE_ERRORS)

        print "Job URL:", urlparse.urljoin(domain, reply_json["data"]["links"]["html"])
        print "Heavy release:", reply_json["data"]["attributes"]["release"]

        if len(generators) > 0:
            print "Downloaded files placed in:"

            # retrieve all requested files
            for i,g in enumerate(generators):
                file_url = urlparse.urljoin(
                    domain,
                    "/".join([
                        reply_json["data"]["links"]["html"],
                        g.replace("-", "/"),
                        "archive.zip"
                    ])
                )
                if file_url and (len(output_dirs) > i or b):
                    r = s.get(
                        file_url,
                        headers={
                            "Authorization": "Bearer " + token,
                            "X-Heavy-Service-Token": service_token
                        },
                        timeout=None # some builds can take a very long time
                    )
                    r.raise_for_status()

                    # write the reply to a temporary file
                    c_zip_path = os.path.join(temp_dir, "archive.{0}.zip".format(g))
                    with open(c_zip_path, "wb") as f:
                        f.write(r.content)

                    # unzip the files to where they belong
                    if b:
                        target_dir = os.path.join(os.path.abspath(os.path.expanduser(output_dirs[0])), g)
                    else:
                        target_dir = os.path.abspath(os.path.expanduser(output_dirs[i]))
                    if not os.path.exists(target_dir):
                        os.makedirs(target_dir) # ensure that the output directory exists
                    __unzip(c_zip_path, target_dir)

                    if g == "c-src" and y:
                        keep_files = ("_{0}.h".format(name), "_{0}.hpp".format(name), "_{0}.cpp".format(name))
                        for f in os.listdir(target_dir):
                            if not f.endswith(keep_files):
                                os.remove(os.path.join(target_dir, f))

                    print "  * {0}: {1}".format(g, target_dir)
                else:
                    print "  * {0}Warning:{1} {2} files could not be retrieved.".format(
                        Colours.yellow, Colours.end,
                        g)

        print "Total request time: {0}ms".format(int(1000.0*(time.time()-tick)))

    except UploaderException as e:
        exit_code = e.code
        if e.message:
            print "{0}Error:{1} {2}".format(Colours.red, Colours.end, e.message)
    except requests.ConnectionError as e:
        print "{0}Error:{1} Could not connect to server. Is the server down? Is the internet down?\n{2}".format(Colours.red, Colours.end, e)
        exit_code = ErrorCodes.CODE_CONNECTION_ERROR
    except requests.Timeout as e:
        print "{0}Error:{1} Connection to server timed out. The server might be overloaded. Try again later?\n{2}".format(Colours.red, Colours.end, e)
        exit_code = ErrorCodes.CODE_CONNECTION_TIMEOUT
    except requests.HTTPError as e:
        if e.response.status_code == requests.status_codes.codes.unauthorized:
            print "{0}Error:{1} Unknown username or password.".format(Colours.red, Colours.end)
        else:
            print "{0}Error:{1} An HTTP error has occurred with URL {2}\n{3}".format(Colours.red, Colours.end, e.request.path_url, e)
        exit_code = ErrorCodes.CODE_CONNECTION_400_500
    except Exception as e:
        # a generic catch for any other exception
        exit_code = exit_code if exit_code != ErrorCodes.CODE_OK else ErrorCodes.CODE_EXCEPTION
        print "{0}Error:{1} ({2}) {3}".format(Colours.red, Colours.end, e.__class__, e)
        print "Getting a weird error? Get the latest version with 'pip install hv-uploader -U', or check for issues at https://github.com/enzienaudio/heavy/issues."
    finally:
        if temp_dir:
            shutil.rmtree(temp_dir) # delete the temporary directory no matter what

    return exit_code, reply_json



def main():
    parser = argparse.ArgumentParser(
        description="Compiles a Pure Data file.")
    parser.add_argument(
        "input_dir",
        help="A directory containing _main.pd. All .pd files in the directory structure will be uploaded.")
    parser.add_argument(
        "-n", "--name",
        default="heavy",
        help="Patch name. If it doesn't exist on the Heavy site, the uploader will fail.")
    parser.add_argument(
        "--owner",
        help="The name of the owner of patch. Usually this is of an organisation.")
    parser.add_argument(
        "-g", "--gen",
        nargs="+",
        help="List of generator outputs. Currently supported generators are '" + "', '".join(sorted(__SUPPORTED_GENERATOR_SET)) + "'.")
    parser.add_argument(
        "-b",
        help="All files will be placed in the output directory, placed in their own subdirectory corresponding to the generator name.",
        action="count")
    parser.add_argument(
        "-y",
        help="Extract only the generated C files. Static files are deleted. "
            "Only effective for the 'c' generator.",
        action="count")
    parser.add_argument(
        "-o", "--out",
        nargs="+",
        default=["./"], # by default
        help="List of destination directories for retrieved files. Order should be the same as for --gen.")
    parser.add_argument(
        "-r", "--release",
        help="Optionally request a specific release of Heavy to use while compiling.")
    parser.add_argument(
        "-rr",
        help="Send a request for a specific release to the server without checking for validity first.",
        action="count")
    parser.add_argument(
        "-v", "--verbose",
        help="Show debugging information.",
        action="count")
    parser.add_argument(
        "-t", "--token",
        help="Use the specified token.")
    parser.add_argument(
        "--clear_token",
        help="Clears the exsiting token and asks for a new one from the command line.",
        action="count")
    parser.add_argument(
        "--service_token",
        help="Use a custom service token.")
    parser.add_argument(
        "-d", "--domain",
        default="https://enzienaudio.com",
        help="Domain. Default is https://enzienaudio.com.")
    parser.add_argument(
        "--force_new_patch",
        help="Create a new patch if the given name doesn't already exist.",
        action="count")
    args = parser.parse_args()

    exit_code, reponse_obj = upload(
        input_dir=args.input_dir,
        output_dirs=args.out,
        name=args.name,
        owner=args.owner,
        generators=args.gen,
        b=args.b,
        y=args.y,
        release=args.release,
        release_override=args.rr,
        domain=args.domain,
        verbose=args.verbose,
        token=args.token,
        clear_token=args.clear_token,
        service_token=args.service_token,
        force_new_patch=args.force_new_patch)

    # exit and return the exit code
    sys.exit(exit_code)



if __name__ == "__main__":
    main()


"""
An example of the server response:

{
  "data": {
    "attributes": {
      "compileTime": 0.266899,
      "index": 188,
      "release": "r2016.11",
      "submittedAt": "2016-12-23T12:49:04.500000",
      "warnings": []
    },
    "id": "mhroth/test_osc/188",
    "links": {
      "html": "/h/mhroth/test_osc/188",
      "self": "/a/jobs/mhroth/test_osc/188"
    },
    "relationships": {
      "files": {
        "data": [
          {
            "id": "mhroth/test_osc/188/c/src",
            "type": "file"
          }
        ]
      },
      "patch": {
        "links": {
          "html": "/h/mhroth/test_osc",
          "self": "/a/patches/mhroth/test_osc"
        }
      },
      "submittedBy": {
        "links": {
          "html": "/h/mhroth",
          "self": "/a/users/mhroth"
        }
      }
    },
    "type": "job"
  },
  "included": [
    {
      "data": {
        "buildId": "c-src",
        "compileTime": 0.266899,
        "date": "2016-12-23T12:49:04.500000",
        "mime": "application/zip",
        "size": 51484
      },
      "id": "mhroth/test_osc/188/c/src",
      "links": {
        "self": "/h/mhroth/test_osc/188/c/src/archive.zip"
      },
      "type": "file"
    }
  ]
}
"""
