import setuptools

from jskom.version import __version__


with open("README.rst", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name='jskom',
    version=__version__,
    description='Jskom is a web based LysKOM client written in Javascript',
    long_description=long_description,
    long_description_content_type="text/x-rst",
    author='Oskar Skoog',
    author_email='oskar@osd.se',
    url='https://github.com/osks/jskom',
    packages=['jskom'],
    classifiers=[],
    include_package_data=True,
    zip_safe=False,
    #python_requires='>=2.7, >=3.7',
    install_requires=[
        'Flask>=1.1.1',
        'Flask-Assets',
        'webassets',
        'cssmin'
    ]
)
