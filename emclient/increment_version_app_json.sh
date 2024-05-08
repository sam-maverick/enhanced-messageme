#!/bin/bash

if [ $1 == "patch" ]
then
  sed -r 's/\s\s\s\s"version": "([0-9]+).([0-9]+).([0-9]+)",/echo -n "    \\"version\\": \\"\1.\2.$((\3+1))\\","/ge' app.json > app.json.tmp
fi

if [ $1 == "minor" ]
then
  sed -r 's/\s\s\s\s"version": "([0-9]+).([0-9]+).([0-9]+)",/echo -n "    \\"version\\": \\"\1.$((\2+1)).\3\\","/ge' app.json > app.json.tmp
fi

if [ $1 == "major" ]
then
  sed -r 's/\s\s\s\s"version": "([0-9]+).([0-9]+).([0-9]+)",/echo -n "    \\"version\\": \\"$((\1+1)).\2.\3\\","/ge' app.json > app.json.tmp
fi

mv app.json.tmp app.json
