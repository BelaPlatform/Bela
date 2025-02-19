#!/bin/bash
set -euo pipefail

SCRIPTDIR=$(dirname "$0")
cd "$SCRIPTDIR/../../"
[ -d examples ] || { echo "You are in the wrong folder" && exit 1; }

for dir in "$PWD/examples/" "$PWD"/examples/*/; do
	cd $dir
	file=${dir}order.json
	[ -f "$file" ] || {
		echo "Warning: '$dir' doesn't have order.json"
		continue
	}
	for a in $(grep -o '".*"' order.json | sed 's/"//g'); do
		example="${dir}$a"
		[ -d "$example" ] || {
			echo "In '$file' folder '$example' does not exist" >&2
			exit 1
		}
	done
done

echo All good
