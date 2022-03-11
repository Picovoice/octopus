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
    f.write('include pvoctopusdemo/otcopus_demo.py\n')

with open(os.path.join(os.path.dirname(__file__), 'README.md'), 'r') as f:
    long_description = f.read()

setuptools.setup(
    name="pvoctopusdemo",
    version="1.1.2",
    author="Picovoice",
    author_email="hello@picovoice.ai",
    description="Octopus Speech-to-Index engine.",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Picovoice/octopus",
    packages=["pvoctopusdemo"],
    install_requires=["pvoctopus==1.1.2", "tabulate"],
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
    python_requires='>=3',
    keywords="Speech-to-Index, voice indexing, speech recognition",
)
