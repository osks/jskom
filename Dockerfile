FROM python:3.8-buster
LABEL maintainer="Oskar Skoog <oskar@osd.se>"

WORKDIR /usr/src/app

COPY requirements.txt ./

RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python3", "-m", "jskom", "--config", "/usr/src/app/configs/debug.cfg"]
