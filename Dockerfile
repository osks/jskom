
FROM python:3.8-buster
LABEL maintainer="Oskar Skoog <oskar@osd.se>"

RUN useradd --system --create-home --shell /bin/bash jskom

WORKDIR /usr/src/app

COPY requirements.txt ./

RUN pip3 install --no-cache-dir -r requirements.txt

COPY jskom jskom

RUN rm -rf jskom/static/.webassets-cache
RUN rm -rf jskom/static/gen
RUN mkdir -p jskom/static/.webassets-cache
RUN mkdir -p jskom/static/gen
RUN chmod u+w jskom/static/.webassets-cache
RUN chmod u+w jskom/static/gen
RUN chown jskom jskom/static/.webassets-cache
RUN chown jskom jskom/static/gen

COPY configs/httpkom-debug.cfg /httpkom.cfg
COPY configs/debug.cfg /jskom.cfg

ENV HTTPKOM_SETTINGS="/httpkom.cfg"
ENV JSKOM_SETTINGS="/jskom.cfg"

USER jskom

EXPOSE 5000

CMD ["python3", "-m", "jskom"]
