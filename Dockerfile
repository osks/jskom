
FROM python:3.8-buster
LABEL maintainer="Oskar Skoog <oskar@osd.se>"

WORKDIR /usr/src/app

COPY requirements.txt ./

RUN pip3 install --no-cache-dir -r requirements.txt

COPY jskom jskom
COPY configs configs

EXPOSE 5000

ENV HTTPKOM_SETTINGS="/usr/src/app/configs/httpkom-debug.cfg"
ENV JSKOM_SETTINGS="/usr/src/app/configs/debug.cfg"

RUN useradd --system --create-home --shell /bin/bash jskom
USER jskom

CMD ["python3", "-m", "jskom"]
