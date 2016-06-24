# Copyright 2015,2016 Enzien Audio, Ltd. All Rights Reserved.

import argparse
import datetime
import getpass
import json
import os
import requests # http://docs.python-requests.org/en/master/api/#exceptions
import shutil
import stat
import sys
import tempfile
import time
import urlparse
import zipfile

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
    CODE_EXCEPTION = 125 # a generic execption has occurred

class UploaderException(Exception):
    def __init__(self, code, message=None, e=None):
        self.code = code
        self.message = message
        self.e = e

# the maxmimum file upload size of 1MB
__HV_MAX_UPLOAD_SIZE = 1 * 1024*1024

def __zip_dir(in_dir, zip_path, file_filter=None):
    """Recursively zip an entire directory with an optional file filter
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
    """Unzip a file to a given directory. All destination files are overwritten.
    """
    zipfile.ZipFile(zip_path).extractall(target_dir)

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
        "-g", "--gen",
        nargs="+",
        default=["c"],
        help="List of generator outputs. Currently supported generators are "
            "'c', 'js', 'pdext', 'pdext-osx', 'unity', 'unity-osx', "
            "'unity-win-x86', 'unity-win-x86_64', 'wwise', 'wwise-win-x86_64', "
            "'vst2' ,'vst2-osx', 'vst2-win-x86_64', and 'vst2-win-x86'.")
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
        "-d", "--domain",
        default="https://enzienaudio.com",
        help="Domain. Default is https://enzienaudio.com.")
    parser.add_argument(
        "-x",
        help="Don't save the returned token.",
        action="count")
    parser.add_argument(
        "-z",
        help="Force the use of a password, regardless of saved token.",
        action="count")
    parser.add_argument(
        "--noverify",
        help="Don't verify the SSL connection. This is generally a very bad idea.",
        action="count")
    parser.add_argument(
        "-v", "--verbose",
        help="Show debugging information.",
        action="count")
    parser.add_argument(
        "-t", "--token",
        help="Use the specified token.")
    args = parser.parse_args()

    try:
        # set default values
        domain = args.domain or "https://enzienaudio.com"
        exit_code = ErrorCodes.CODE_OK
        temp_dir = None
        post_data = {}

        # token should be stored in ~/.heavy/token
        token_path = os.path.expanduser(os.path.join("~/", ".heavy", "token"))

        if args.token is not None:
            # check if token has been passed as a command line arg...
            post_data["credentials"] = {"token": args.token}
        elif os.path.exists(token_path) and not args.z:
            # ...or if it is stored in the user's home directory
            with open(token_path, "r") as f:
                post_data["credentials"] = {"token": f.read()}
        else:
            # otherwise, get the username and password
            post_data["credentials"] = {
                "username": raw_input("Enter username: "),
                "password": getpass.getpass("Enter password: ")
            }

        tick = time.time()

        # parse the optional release argument
        if args.release:
            # check the validity of the current release
            releases_json = requests.get(urlparse.urljoin(domain, "/a/releases")).json()
            if args.release in releases_json:
                today = datetime.datetime.now()
                valid_until = datetime.datetime.strptime(releases_json[args.release]["validUntil"], "%Y-%m-%d")
                if today > valid_until:
                    print "{0}Warning:{1} The release \"{2}\" expired on {3}. It may be removed at any time!".format(
                        Colours.yellow, Colours.end,
                        args.release,
                        releases_json[args.release]["validUntil"])
                elif (valid_until - today) <= datetime.timedelta(weeks=4):
                    print "{0}Warning:{1} The release \"{2}\" will expire soon on {3}.".format(
                        Colours.yellow, Colours.end,
                        args.release,
                        releases_json[args.release]["validUntil"])
            else:
                print "{0}Error:{1} The release \"{2}\" is not available. Available releases are:".format(
                    Colours.red, Colours.end,
                    args.release)
                for k,v in releases_json.items():
                    print "* {0} ({1})".format(
                        k,
                        v["releaseDate"])
                raise UploaderException(ErrorCodes.CODE_RELEASE_NOT_AVAILABLE)

            post_data["release"] = args.release

        # make a temporary directory
        temp_dir = tempfile.mkdtemp(prefix="lroyal-")

        # zip up the pd directory into the temporary directory
        if not os.path.exists(os.path.join(args.input_dir, "_main.pd")):
            raise UploaderException(
                ErrorCodes.CODE_MAIN_NOT_FOUND,
                "Root Pd directory does not contain a file named _main.pd.")
        zip_path = __zip_dir(
            args.input_dir,
            os.path.join(temp_dir, "archive.zip"),
            file_filter={"pd"})
        if os.stat(zip_path).st_size > __HV_MAX_UPLOAD_SIZE:
            raise UploaderException(
                ErrorCodes.CODE_UPLOAD_ASSET_TOO_LARGE,
                "The target directory, zipped, is {0} bytes. The maximum upload size of 1MB.".format(
                    os.stat(zip_path).st_size))

        post_data["name"] = args.name

        # the outputs to generate (always include c)
        __SUPPORTED_GENERATOR_SET = {
            "c", "js",
            "pdext", "pdext-osx",
            "unity", "unity-osx", "unity-win-x86", "unity-win-x86_64",
            "wwise", "wwise-win-x86_64",
            "vst2", "vst2-osx", "vst2-win-x86_64",
        }
        post_data["gen"] = list(({"c"} | {s.lower() for s in set(args.gen)}) & __SUPPORTED_GENERATOR_SET)

        # upload the job, get the response back
        # NOTE(mhroth): multipart-encoded file can only be sent as a flat dictionary,
        # but we want to send a json encoded deep dictionary. So we do a bit of a hack.
        r = requests.post(
            urlparse.urljoin(domain, "/a/heavy"),
            data={"json":json.dumps(post_data)},
            files={"file": (os.path.basename(zip_path), open(zip_path, "rb"), "application/zip")},
            verify=False if args.noverify else True)
        r.raise_for_status()

        """
        {
          "data": {
            "compileTime": 0.05078411102294922,
            "id": "mhroth/asdf/Edp2G",
            "slug": "Edp2G",
            "index": 3,
            "links": {
              "files": {
                "linkage": [
                  {
                    "id": "mhroth/asdf/Edp2G/c",
                    "type": "file"
                  }
                ],
                "self": "https://enzienaudio.com/h/mhroth/asdf/Edp2G/files"
              },
              "project": {
                "linkage": {
                  "id": "mhroth/asdf",
                  "type": "project"
                },
                "self": "https://enzienaudio.com/h/mhroth/asdf"
              },
              "self": "https://enzienaudio.com/h/mhroth/asdf/Edp2G",
              "user": {
                "linkage": {
                  "id": "mhroth",
                  "type": "user"
                },
                "self": "https://enzienaudio.com/h/mhroth"
              }
            },
            "type": "job"
          },
          "included": [
            {
              "filename": "file.c.zip",
              "generator": "c",
              "id": "mhroth/asdf/Edp2G/c",
              "links": {
                "self": "https://enzienaudio.com/h/mhroth/asdf/Edp2G/c/file.c.zip"
              },
              "mime": "application/zip",
              "type": "file"
            }
          ],
          "warnings": [
            {"details": "blah blah blah"}
          ],
          "meta": {
            "token": "11AS0qPRmjTUHEMSovPEvzjodnzB1xaz"
          }
        }
        """
        # decode the JSON API response
        reply_json = r.json()
        if args.verbose:
            print json.dumps(
                reply_json,
                sort_keys=True,
                indent=2,
                separators=(",", ": "))

        # update the api token, if present
        if "token" in reply_json.get("meta",{}) and not args.x:
            if args.token is not None:
                if reply_json["meta"]["token"] != args.token:
                    print "WARNING: Token returned by API is not the same as the "
                    "token supplied at the command line. (old = %s, new = %s)".format(
                        args.token,
                        reply_json["meta"]["token"])
            else:
                if not os.path.exists(os.path.dirname(token_path)):
                    # ensure that the .heavy directory exists
                    os.makedirs(os.path.dirname(token_path))
                with open(token_path, "w") as f:
                    f.write(reply_json["meta"]["token"])
                # force rw------- permissions on the file
                os.chmod(token_path, stat.S_IRUSR | stat.S_IWUSR)

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

        # retrieve all requested files
        for i,g in enumerate(args.gen):
            file_url = __get_file_url_for_generator(reply_json, g)
            if file_url and (len(args.out) > i or args.b):
                r = requests.get(
                    file_url,
                    cookies={"token": reply_json["meta"]["token"]},
                    verify=False if args.noverify else True)
                r.raise_for_status()

                # write the reply to a temporary file
                c_zip_path = os.path.join(temp_dir, "archive.{0}.zip".format(g))
                with open(c_zip_path, "wb") as f:
                    f.write(r.content)

                # unzip the files to where they belong
                if args.b:
                    target_dir = os.path.join(os.path.abspath(os.path.expanduser(args.out[0])), g)
                else:
                    target_dir = os.path.abspath(os.path.expanduser(args.out[i]))
                if not os.path.exists(target_dir):
                    os.makedirs(target_dir) # ensure that the output directory exists
                __unzip(c_zip_path, target_dir)

                if g == "c" and args.y:
                    keep_files = ("_{0}.h".format(args.name), "_{0}.c".format(args.name))
                    for f in os.listdir(target_dir):
                        if not f.endswith(keep_files):
                            os.remove(os.path.join(target_dir, f));

                print "{0} files placed in {1}".format(g, target_dir)
            else:
                print "{0}Warning:{1} {2} files could not be retrieved.".format(
                    Colours.yellow, Colours.end,
                    g)

            print "Job URL:", reply_json["data"]["links"]["self"]
            print "Total request time: {0}ms".format(int(1000.0*(time.time()-tick)))
            print "Heavy release:", reply_json.get("meta",{}).get("release", "default")
    except UploaderException as e:
        exit_code = e.code
        if e.message:
            print "{0}Error:{1} {2}".format(Colours.red, Colours.end, e.message)
    except requests.ConnectionError as e:
        print "{0}Error:{1} Could not connect to server. Is the server down? Is the internet down?\n{2}".format(Colours.red, Colours.end, e)
        exit_code = ErrorCodes.CODE_CONNECTION_ERROR
    except requests.ConnectTimeout as e:
        print "{0}Error:{1} Connection to server timed out. The server might be overloaded. Try again later?\n{2}".format(Colours.red, Colours.end, e)
        exit_code = ErrorCodes.CODE_CONNECTION_TIMEOUT
    except requests.HTTPError as e:
        print "{0}Error:{1} An HTTP error has occurred.\n{2}".format(Colours.red, Colours.end, e)
        exit_code = ErrorCodes.CODE_CONNECTION_400_500
    except Exception as e:
        exit_code = ErrorCodes.CODE_EXCEPTION
        print "{0}Error:{1} {2}".format(Colours.red, Colours.end, e)
        print "Getting a weird error? Get the latest uploader at https://enzienaudio.com/static/uploader.py"
    finally:
        if temp_dir:
            shutil.rmtree(temp_dir) # delete the temporary directory no matter what

    # exit and return the exit code
    sys.exit(exit_code)

def __get_file_url_for_generator(json_api, g):
    """Returns the file link for a specific generator.
    Returns None if no link could be found.
    """
    for i in json_api["included"]:
        if g == i["generator"]:
            return i["links"]["self"]
    return None # by default, return None



if __name__ == "__main__":
    main()
