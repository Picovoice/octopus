import os
import shutil

import setuptools

INCLUDE_FILES = ('../../LICENSE', '__init__.py', '_factory.py', '_octopus.py', '_util.py')
INCLUDE_LIBS = ('linux', 'mac', 'windows')

os.system('git clean -dfx')

package_folder = os.path.join(os.path.dirname(__file__), 'pvoctopus')
os.mkdir(package_folder)
manifest_in = ""

for rel_path in INCLUDE_FILES:
    shutil.copy(os.path.join(os.path.dirname(__file__), rel_path), package_folder)
    manifest_in += "include pvoctopus/%s\n" % os.path.basename(rel_path)

model_subdir = 'lib/common/param'
model_file = 'octopus_params.pv'
os.makedirs(os.path.join(package_folder, model_subdir))
shutil.copy(
    os.path.join(os.path.dirname(__file__), '../..', model_subdir, model_file),
    os.path.join(package_folder, model_subdir, model_file))
manifest_in += "include pvoctopus/%s/%s\n" % (model_subdir, model_file)

for platform in INCLUDE_LIBS:
    shutil.copytree(
        os.path.join(os.path.dirname(__file__), '../../lib', platform),
        os.path.join(package_folder, 'lib', platform))
    manifest_in += "recursive-include pvoctopus/lib/%s *\n" % platform

with open(os.path.join(os.path.dirname(__file__), 'MANIFEST.in'), 'w') as f:
    f.write(manifest_in)

with open(os.path.join(os.path.dirname(__file__), 'README.md'), 'r') as f:
    long_description = f.read()

setuptools.setup(
    name="pvoctopus",
    version="2.0.0",
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
    python_requires='>=3.8',
    keywords="Speech-to-Index, Voice Search, Keyword Spotting, Speech Recognition, Voice Recognition"
)
