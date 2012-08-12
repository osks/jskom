from setuptools import setup
from jskom.version import __version__

setup(
    name='jskom',
    version=__version__,
    author='Oskar Skoog',
    author_email='oskar@osd.se',
    long_description=__doc__,
    packages=['jskom'],
    include_package_data=True,
    zip_safe=False,
    install_requires=['Flask', 'Flask-Assets', 'webassets', 'cssmin']
)
