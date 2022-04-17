#!/bin/bash -e

[ -z "$DETECT_LIBRARIES_VERBOSE" ] && DETECT_LIBRARIES_VERBOSE=0
getfield() {
	awk -v pat="$1" -F"=" ' $0 ~ pat { print $2 } ' $2
}

extract_dependencies() {
	LIBRARY=$1
	echo Using library $LIBRARY
	MDFILE="libraries/$LIBRARY/lib.metadata";
	echo "$LIBRARY" >> "$LIBLIST"

	create_linkmakefile $LIBRARY $MDFILE
	create_compilemakefile $LIBRARY $MDFILE
	echo "-include libraries/$LIBRARY/build/Makefile.link" >> $TMPMKFILE

	DEPENDENCIES=$(getfield dependencies $MDFILE) ;
	DEPENDENCIES=$(echo $DEPENDENCIES | sed 's/,/\n/g') ;
	for D in $DEPENDENCIES ; do
		if ! grep -Fxq "$D" "$LIBLIST" ; then
			extract_dependencies $D ;
		else
			if [ "$DETECT_LIBRARIES_VERBOSE" != 0 ]
			then
				echo Library $D has already been checked for dependencies
			fi
		fi
	done
}

create_linkmakefile() {
	LIBRARY=$1
	MDFILE=$2
	MKFILELINK="libraries/$LIBRARY/build/Makefile.link"
	# check if we need to rebuild, or return
	if [ -f $MKFILELINK ]; then
		FOUND=`find "libraries/$LIBRARY/" -maxdepth 1 -regex ".*\.cpp\|.*\.c\|.*.cc" -newer $MKFILELINK 2> /dev/null | wc -l`
		[ $FOUND -eq 0 ] && return
	fi

	mkdir -p "libraries/$LIBRARY/build/"
	echo "#This file is generated automatically by `basename $0`. DO NOT EDIT" > $MKFILELINK
	echo "LIBRARY := $LIBRARY" >> $MKFILELINK
	echo "THIS_CPPFILES := \$(wildcard libraries/\$(LIBRARY)/*.cpp)" >> $MKFILELINK 
	echo "THIS_CFILES := \$(wildcard libraries/\$(LIBRARY)/*.c)" >> $MKFILELINK
	echo "LIBRARIES_OBJS := \$(LIBRARIES_OBJS) \$(addprefix libraries/\$(LIBRARY)/build/,\$(notdir \$(THIS_CPPFILES:.cpp=.o) \$(THIS_CFILES:.c=.o)))" >> $MKFILELINK
	echo "ALL_DEPS := \$(ALL_DEPS) \$(addprefix libraries/\$(LIBRARY)/build/,\$(notdir \$(THIS_CPPFILES:.cpp=.d)))" >> $MKFILELINK
	DIR=libraries/$LIBRARY
	for SOURCE in `ls $DIR/*.cpp $DIR/*.c $DIR/*.cc 2>/dev/null`; do
		FILENAME=`basename $SOURCE`
		OBJ=$DIR/build/${FILENAME%.*}.o
		echo "$OBJ: $SOURCE" >> $MKFILELINK
	done
	echo "LIBRARIES_LDLIBS += $(getfield LDLIBS $MDFILE)" >> $MKFILELINK
	echo "LIBRARIES_LDFLAGS += $(getfield LDFLAGS $MDFILE)" >> $MKFILELINK
}

echo_field() {
	SEARCHFIELD=$1
	FIELDNAME=$2; [ ! -z "$FIELDNAME" ] || FIELDNAME=$SEARCHFIELD
	FIELD=`getfield $SEARCHFIELD $MDFILE`; [ -z "$FIELD" ] || echo "$FIELDNAME := $FIELD" >> $MKFILECOMP
}
create_compilemakefile() {
	LIBRARY=$1
	MDFILE=$2
	MKFILECOMP="libraries/$LIBRARY/build/Makefile.compile"
	# check if we need to rebuild, or return
	[ "$MKFILECOMP" -nt "$MDFILE"  ] && return
	mkdir -p "libraries/$LIBRARY/build/"
	echo "#This file is generated automatically by `basename $0`. DO NOT EDIT" > $MKFILECOMP
	echo_field CC LIBRARY_CC
	echo_field CXX LIBRARY_CXX	
	echo_field CFLAGS LIBRARY_CFLAGS
	echo_field CXXFLAGS LIBRARY_CXXFLAGS
	echo_field CPPFLAGS LIBRARY_CPPFLAGS

}

## Script starts here

mkdir -p tmp/
# Create & empty temporary files
LIBLIST="tmp/liblist"
>"$LIBLIST"
>"tmp/libraries"
>"tmp/Makefile.inc"
TMPMKFILE="tmp/Makefile.inc"

function processBuildFolder()
{
	# Get included libraries on project from pre-processor's output
	DIR=$1
	grep -R --include \*.ii --include \*.i "^# [1-9]\{1,\} \"./libraries/.\{1,\}\"" "$DIR" | sed 's:.*"./libraries/\(.*\)/.*:\1:' | sort -u > tmp/libraries
	MKFILEPATH="$DIR"
}

while [ $# -gt 0 ]; do
	case "$1" in
		-p|--project)
			shift
			PROJECT=$1
			if [ -z "$PROJECT" ] ; then
				echo "Please, specify a project name."
				exit
			fi
			shift
			processBuildFolder projects/$PROJECT/build
			;;
		--path)
			shift
			BUILD_FOLDER=$1
			if [ -z "$BUILD_FOLDER" ] ; then
				echo "Please, specify a path to the build folder."
				exit
			fi
			shift
			processBuildFolder $BUILD_FOLDER
			break
			;;
		-f|--file)
			shift
			FILE=$1
			if [ -z "$FILE" ]; then
				echo "Please, specify a file name."
				exit
			fi
			shift
			# Get included libraries from file
			grep -R "^# [1-9]\{1,\} \"./libraries/.\{1,\}\"" $FILE | sed 's:.*"./libraries/\(.*\)/.*:\1:' | sort -u > tmp/libraries
			MKFILEPATH=`dirname "$FILE"`
			;;
		--outpath)
			shift
			MKFILEPATH=$1
			if [ -z "$MKFILEPATH" ]; then
				echo "Please, specify a file name."
				exit
			fi
			shift
			;;
		-l|--library)
			shift
			LIB=$1
			if [ -z "$LIB" ] ; then
				echo "Please, specify a library name."
				exit
			fi
			shift
			echo $LIB
			extract_dependencies $LIB
			exit
			;;
		*)
			echo Unknown option $1 >&2
			exit 1
			;;
	esac
done

MKFILE="$MKFILEPATH/Makefile.inc"
mkdir -p "$MKFILEPATH"

cat tmp/libraries | while read L; do
	extract_dependencies $L
done

# make sure we only include each library once
cat $TMPMKFILE | sort -u  > tmp/tmpmkfile
mv tmp/tmpmkfile $MKFILE
