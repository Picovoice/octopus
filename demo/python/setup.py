import os
import shutil

import setuptools

os.system('git clean -dfx')

package_folder = os.path.join(os.path.dirname(__file__), 'pvoctopusdemo')
os.mkdir(package_folder)

shutil.copy(os.path.join(os.path.dirname(__file__), '../../LICENSE'), package_folder)

shutil.copy(
    os.path.join(os.path.dirname(__file__), 'octopus_demo.py'),
    os.path.join(package_folder, 'octopus_demo.py'))

with open(os.path.join(os.path.dirname(__file__), 'MANIFEST.in'), 'w') as f:
    f.write('include pvoctopusdemo/LICENSE\n')
    f.write('include pvoctopusdemo/octopus_demo.py\n')

with open(os.path.join(os.path.dirname(__file__), 'README.md'), 'r') as f:
    long_description = f.read()

with open(os.path.join(os.path.dirname(__file__), "requirements.txt"), "r") as f:
    dependencies = f.read().strip().splitlines()

setuptools.setup(
    name="pvoctopusdemo",
    version="2.0.1",
    author="Picovoice",
    author_email="hello@picovoice.ai",
    description="Octopus Speech-to-Index engine demo.",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Picovoice/octopus",
    packages=["pvoctopusdemo"],
    install_requires=dependencies,
    include_package_data=True,
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Topic :: Multimedia :: Sound/Audio :: Speech"
    ],
    entry_points=dict(
        console_scripts=[
            'octopus_demo=pvoctopusdemo.octopus_demo:main',
        ],
    ),
    python_requires='>=3.9',
    keywords="Speech-to-Index, Voice Search, Keyword Spotting, Speech Recognition, Voice Recognition",
)
