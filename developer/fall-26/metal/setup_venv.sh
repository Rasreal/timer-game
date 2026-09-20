#!/usr/bin/env bash
# Create the local Python 3.12 environment and its Jupyter kernel.
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$project_dir"

if ! command -v python3.12 >/dev/null 2>&1; then
  if ! command -v brew >/dev/null 2>&1; then
    echo "Python 3.12 is required. Install it, then rerun this script." >&2
    exit 1
  fi
  brew install python@3.12
fi

if [ -d .venv ]; then
  backup_dir=".venv.before_setup_$(date +%Y%m%d_%H%M%S)"
  mv .venv "$backup_dir"
  echo "Preserved the previous environment as $backup_dir"
fi

# --copies avoids a Homebrew-framework symlink issue observed on macOS 26.
if ! python3.12 -m venv --copies .venv; then
  echo "Homebrew ensurepip did not complete; applying the local compatibility fix."
fi

# Homebrew Python 3.12.14 on macOS 26 links pyexpat to an incompatible system
# Expat ABI. Keep the correction wholly inside .venv; no project package is
# installed globally.
if ! .venv/bin/python -c 'import pyexpat' >/dev/null 2>&1; then
  brew install expat
  local_dynload=".venv/lib/python3.12/local-dynload"
  mkdir -p "$local_dynload"
  cp "$(python3.12 -c 'import sysconfig; print(sysconfig.get_path("DESTSHARED"))')/pyexpat.cpython-312-darwin.so" "$local_dynload/"
  install_name_tool -change /usr/lib/libexpat.1.dylib /opt/homebrew/opt/expat/lib/libexpat.1.dylib "$local_dynload/pyexpat.cpython-312-darwin.so"
  codesign --force --sign - "$local_dynload/pyexpat.cpython-312-darwin.so"
  printf "%s\n" "import importlib.util,sys;p=r'$project_dir/.venv/lib/python3.12/local-dynload/pyexpat.cpython-312-darwin.so';s=importlib.util.spec_from_file_location('pyexpat',p);m=importlib.util.module_from_spec(s);sys.modules['pyexpat']=m;s.loader.exec_module(m)" > .venv/lib/python3.12/site-packages/00-metal-pyexpat.pth
fi

.venv/bin/python -m ensurepip --upgrade --default-pip
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m ipykernel install --user --name metal-benchmark --display-name "Python 3.12 (metal-benchmark)"
.venv/bin/python -m pip check

echo "Ready: select the 'Python 3.12 (metal-benchmark)' Jupyter kernel."
