#!/bin/bash -e

getfield() {
	grep -i "$1=" $2 | sed "s/$1=\(.*\)/\1/"
}

extract_dependencies() {
	LIBRARY=$1
	MDFILE="libraries/$LIBRARY/lib.metadata";
	if [ -f $MDFILE ] ; then

		create_linkmakefile $LIBRARY $MDFILE
		create_compilemakefile $LIBRARY $MDFILE
		echo "-include libraries/$LIBRARY/build/Makefile.link" >> $TMPMKFILE 

		DEPENDENCIES=$(getfield dependencies $MDFILE) ;
		DEPENDENCIES=$(echo $DEPENDENCIES | sed 's/,/\n/g') ;
		for D in $DEPENDENCIES ; do
			extract_dependencies $D ;
		done
	fi
}

create_linkmakefile() {
	LIBRARY=$1
	MDFILE=$2
	mkdir -p "libraries/$LIBRARY/build/"
	MKFILELINK="libraries/$LIBRARY/build/Makefile.link"
	> $MKFILELINK
	echo "LIBRARY=$LIBRARY" >> $MKFILELINK
	echo "THIS_CPPFILES := \$(wildcard libraries/\$(LIBRARY)/*.cpp)" >> $MKFILELINK 
	echo "LIBRARIES_OBJS := \$(LIBRARIES_OBJS) \$(addprefix libraries/\$(LIBRARY)/build/,\$(notdir \$(THIS_CPPFILES:.cpp=.o)))" >> $MKFILELINK 
	echo "ALL_DEPS := \$(ALL_DEPS) \$(addprefix libraries/\$(LIBRARY)/build/,\$(notdir \$(THIS_CPPFILES:.cpp=.d)))" >> $MKFILELINK 
	echo "LIBRARIES_LDFLAGS += $(getfield LDFLAGS $MDFILE)" >> $MKFILELINK
}

echo_field() {
	FIELD=$(getfield $1 $MDFILE); [ -z "$FIELD" ] || echo "$1 := $FIELD" >> $MFILECOMP
}
create_compilemakefile() {
	LIBRARY=$1
	MDFILE=$2
	mkdir -p "libraries/$LIBRARY/build/"
	MFILECOMP="libraries/$LIBRARY/build/Makefile.compile"
	> $MFILECOMP
	echo_field CC
	echo_field CXX
	echo_field CFLAGS
	echo_field CXXFLAGS
	echo_field CPPFLAGS
}


PROJECT=$1

# Get included libraries on project from pre-processor's output 
grep -R --include \*.ii --include \*.i "^# [1-9]\{1,\} \"./libraries/.\{1,\}\"" projects/$PROJECT/build | sed 's:.*"./libraries/\(.*\)/.*:\1:' | uniq > tmp/libraries	

>"tmp/Makefile.inc"
TMPMKFILE="tmp/Makefile.inc"
MKFILE="projects/$PROJECT/build/Makefile.inc"
#> "projects/$PROJECT/build/Makefile.inc"

cat tmp/libraries | while read L; do
	extract_dependencies $L
done

# make sure we only include a library once
uniq $TMPMKFILE tmp/tmpmkfile
mv tmp/tmpmkfile $TMPMKFILE

cmp -s $TMPMKFILE $MKFILE && COMP=0 || COMP=1
if [ $COMP -eq 1 ] ; then
	cat $TMPMKFILE > $MKFILE
fi
