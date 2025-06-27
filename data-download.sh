#!/bin/bash
set -e
BASE_DIR="$( dirname "$(realpath $0)" )"
cd $BASE_DIR

DOWNLOAD_DIR="download"
mkdir -p $DOWNLOAD_DIR

cd $DOWNLOAD_DIR
echo download

if [[ -e hannover.zip ]]; then
  echo already existing
else
  wget --output-document hannover.zip "https://www.hannover.de/content/download/889451/file/Stra%C3%9Fenverzeichnis.zip"
fi

echo extracting
unzip -p hannover.zip '*.xlsx' > hannover.xlsx

