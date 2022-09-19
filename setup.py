import setuptools


with open("README.rst", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name='jskom',
    version='0.26+dev',
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
    python_requires='>=3.7',
    install_requires=[
        'httpkom>=0.21',
        'Flask>=2.2.2',
        'Quart>=0.18.0',
        'Hypercorn>=0.14.3',
        'webassets>=2.0',
        'cssmin>=0.2.0',
    ]
)
