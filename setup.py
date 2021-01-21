import setuptools


with open("README.rst", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name='jskom',
    version='0.25',
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
    python_requires='>=3.6',
    install_requires=[
        'httpkom>=0.19',
        'Flask>=1.1.1',
        'Quart>=0.10.0',
        'Hypercorn>=0.9.0',
        'webassets>=2.0',
        'cssmin>=0.2.0',
    ]
)
