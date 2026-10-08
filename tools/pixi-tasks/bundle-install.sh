#!/usr/bin/env bash
set -euo pipefail

bundler_version="2.5.23"
export PATH="$PWD/.pixi/gems/bin:$PATH"
export GEM_HOME="$PWD/.pixi/gems"
export GEM_PATH="$GEM_HOME"
export BUNDLE_PATH="$PWD/.pixi/bundle"
if ! gem list --local --exact bundler --version "$bundler_version" >/dev/null 2>&1; then
  gem install --no-document bundler --version "$bundler_version"
fi
bundle install --jobs 4
