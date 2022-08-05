import os
import shutil

import setuptools

os.system('git clean -dfx')

package_folder = os.path.join(os.path.dirname(__file__), 'pvoctopus')
os.mkdir(package_folder)

shutil.copy(os.path.join(os.path.dirname(__file__), '../../LICENSE'), package_folder)

shutil.copy(os.path.join(os.path.dirname(__file__), '__init__.py'), os.path.join(package_folder, '__init__.py'))
shutil.copy(os.path.join(os.path.dirname(__file__), 'octopus.py'), os.path.join(package_folder, 'octopus.py'))
shutil.copy(os.path.join(os.path.dirname(__file__), 'util.py'), os.path.join(package_folder, 'util.py'))

platforms = ('linux', 'mac', 'windows')

os.mkdir(os.path.join(package_folder, 'lib'))
for platform in platforms:
    shutil.copytree(
        os.path.join(os.path.dirname(__file__), '../../lib', platform),
        os.path.join(package_folder, 'lib', platform))

os.makedirs(os.path.join(package_folder, 'lib/common/param'))
shutil.copy(
    os.path.join(os.path.dirname(__file__), '../../lib/common/param/octopus_params.pv'),
    os.path.join(package_folder, 'lib/common/param/octopus_params.pv'))

MANIFEST_IN = """
include pvoctopus/LICENSE
include pvoctopus/__init__.py
include pvoctopus/octopus.py
include pvoctopus/util.py
include pvoctopus/lib/common/param/octopus_params.pv
include pvoctopus/lib/linux/x86_64/libpv_octopus.so
include pvoctopus/lib/mac/x86_64/libpv_octopus.dylib
include pvoctopus/lib/mac/arm64/libpv_octopus.dylib
include pvoctopus/lib/windows/amd64/libpv_octopus.dll
"""

with open(os.path.join(os.path.dirname(__file__), 'MANIFEST.in'), 'w') as f:
    f.write(MANIFEST_IN.strip('\n '))

with open(os.path.join(os.path.dirname(__file__), 'README.md'), 'r') as f:
    long_description = f.read()

setuptools.setup(
    name="pvoctopus",
    version="1.2.1",
    author="Picovoice",
    author_email="hello@picovoice.ai",
    description="Octopus Speech-to-Index engine.",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Picovoice/octopus",
    packages=["pvoctopus"],
    include_package_data=True,
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Topic :: Multimedia :: Sound/Audio :: Speech"
    ],
    python_requires='>=3.5',
    keywords="Speech-to-Index, Voice Search, Keyword Spotting, Speech Recognition, Voice Recognition"
)
