# Changelog for jskom

## Unreleased

### Added

- Showing in the footer which server the current session is on.
- Grouping sessions by server in the sessions menu.


## 0.26 (2022-09-12)

### Added

- UI for changing the presentation of the current person.
- UI for changing the password of the current person.

### Fixed

- Update httpkom and pylyskom versions to handle reading texts by
  anonymous users and comments to texts by anonymous users.


## 0.25 (2021-01-21)

### Fixed

- More work towards avoiding bad browser caching. Index page should
  not be cached now and API requests should also use the static
  version in URLs.

### Changed

- The initial fetch of membership now fetches a few (20) in the first
  request, and then fetches more (200) per request. This is to make
  the web page feel faster when logging in, because it's quite slow to
  fetch memberships after logging in (as non of the uconfs are cached
  by httpkom).


## 0.24 (2021-01-20)

### Fixed

- Update httpkom version to fix serialization issues


## 0.23 (2021-01-20)

### Fixed

- Fixed pylyskom version in requirements.txt so the Docker image can build.


## 0.22 (2021-01-20)

### Changed

- Updates to work with next versions of httpkom/pylyskom (conf_name -> name).


## 0.21 (2020-07-03)

### Added

- Command line arguments for enabling debug logging (now off by default).

### Fixed

- Incorrect use of async methods.

### Changed

- Updated required httpkom version to 0.17


## 0.20 (2020-07-03)

### Added

- Command line arguments for which host and port to listen on.

### Fixed

- Dockerfile improvements.


## 0.19 (2020-07-01)

### Fixed

- Exclude webassets cache files in python dist.


## 0.18 (2020-07-01)

### Changed

- Updated required httpkom version to 0.16.
- Dockerfile improvements.
- Minor changes.


## 0.17 (2020-02-07)

### Fixed

- Fix version handling. It wasn't possible to install httpkom due to
  the way we tried to single source the package version.

### Changed

- Run with python3 -m jskom
- Converted from using Flask to Quart (and Hypercorn), to be able to
  include the httpkom API in the same server process. Uses the asyncio
  version of httpkom / pylyskom.

### Added

- Jskom now includes the httpkom API in the same webserver and it's
  used by default. This is simplify the setup and to avoid having to
  run httpkom separately (separate cert, process management, etc). It
  is still possible to continue using jskom with a separate httpkom
  server (using the HTTPKOM_SERVER variable).


## 0.16 (2020-01-24)

- New "Go to text" page (under the Texts menu).
- Now uses Referrer Policy "origin-when-cross-origin".
- Updated versions for Flask and Werkzeug dependencies.
- Published on PyPI.


## 0.15 (2020-01-24)

(Same as 0.16 but was discarded because a faulty dist was uploaded to
PyPI.)


## 0.14 (2016-05-29)

### Added

- Setting version on what has been working okay for several years now.
- Added changelog.
- mx-date and mx-author handling.
- Support for showing link to conference FAQ text.

### Fixed

- Fixed various caching issues.
- Fixed bug #45.

### Changed

- Probably some other things I have forgotten about.


## 0.13 (2013-02-11)

## 0.12 (2013-01-08)

## 0.11 (2012-12-18)

## 0.10 (2012-12-02)

## 0.9 (2012-10-21)
