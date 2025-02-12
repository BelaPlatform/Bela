#!/bin/bash
set -euo pipefail

SCRIPTDIR=$(dirname "$0")
cd "$SCRIPTDIR/../../"
[ -d libraries -a -d examples ] || { echo "You are in the wrong folder" && exit 1; }

echo "Checking that all examples referenced by the libraries exist"
error=0
warning=0
for a in libraries/*; do
	LIBRARY=$(echo $a | sed "s/libraries\/\(.*\)/\1/")
	META="libraries/$LIBRARY/lib.metadata"
	[ -f "$META" ] || {
		echo "Library $LIBRARY does not have lib.metadata"
		error=1
		continue
	}
	USED_BY=$(grep -cRI "libraries/$LIBRARY/" examples/*/* | grep -v :0 |
		grep -v Extras/ | # filter out some examples we don't want to force to be in there
		grep -v terminal-only/ |
		grep -v Instruments/d-box |
		grep -v PureData/custom-render |
		sed "s/\(examples\/.*\)\/.*/  \1/" || true)
	for b in $(grep -h examples=.* "$META" | sed s/examples=// | sed "s/,/ /g" ); do
		EXAMPLE="examples/$b"
		[ -d "$EXAMPLE" ] || {
			echo "$EXAMPLE, referenced by $META, does not exist"
			error=1
			continue
		}
		grep -q "libraries/$LIBRARY/" $EXAMPLE/*.* || {
			echo "ERROR: $EXAMPLE does not use library $LIBRARY but it is referenced as an example in $META"
			error=1
			continue
		}
		USED_BY=$(echo $USED_BY | sed "s:$EXAMPLE::")
	done
	USED_BY=$(echo $USED_BY | sed "s/  */ /g" | sed "s/^ //")
	[ -n "$USED_BY" ] && {
		printf "  warning: $LIBRARY is used by but does not reference the following examples: "
		warning=1
		first=1
		for e in $USED_BY; do
			[ $first -eq 1 ] || printf ", "
			first=0
			printf "$(echo $e | sed 's/examples\///')"
		done
		echo
	}
done

[ 0 -ne $error ] && exit 1

echo "All good: all referenced examples are valid and use the respective library."
[ 1 -eq $warning ] && echo "Some libraries do not reference all the examples that use them."
