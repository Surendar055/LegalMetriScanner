#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Maven Wrapper for Unix (LegalMetriScan)
# ----------------------------------------------------------------------------
MAVEN_VERSION="3.9.9"
MAVEN_DIR="$HOME/.m2/wrapper/dists/apache-maven-${MAVEN_VERSION}-bin/apache-maven-${MAVEN_VERSION}"
MVN_CMD="$MAVEN_DIR/bin/mvn"

if [ ! -x "$MVN_CMD" ]; then
  echo "[mvnw] Downloading Maven ${MAVEN_VERSION}..."
  mkdir -p "$HOME/.m2/wrapper/dists/apache-maven-${MAVEN_VERSION}-bin"
  ZIP_PATH="$HOME/.m2/wrapper/dists/apache-maven-${MAVEN_VERSION}-bin/apache-maven-${MAVEN_VERSION}-bin.zip"
  curl -fsSL "https://archive.apache.org/dist/maven/maven-3/${MAVEN_VERSION}/binaries/apache-maven-${MAVEN_VERSION}-bin.zip" -o "$ZIP_PATH"
  unzip -q -o "$ZIP_PATH" -d "$HOME/.m2/wrapper/dists/apache-maven-${MAVEN_VERSION}-bin"
  rm -f "$ZIP_PATH"
  chmod +x "$MVN_CMD"
fi

exec "$MVN_CMD" "$@"
