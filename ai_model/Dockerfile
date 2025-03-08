# 
FROM python:3.7.9

# 
WORKDIR /code

# 
COPY ./requirements.txt /code/requirements.txt

# 
COPY ./model_training.py /code/model_training.py

#
COPY ./.env /code/.env

# 
COPY ./traces2_1.csv /code/traces2_1.csv
COPY ./traces2_2.csv /code/traces2_2.csv
COPY ./traces2_3.csv /code/traces2_3.csv
COPY ./traces2_4.csv /code/traces2_4.csv
COPY ./traces2_5.csv /code/traces2_5.csv
COPY ./traces2_6.csv /code/traces2_6.csv
COPY ./traces2_7.csv /code/traces2_7.csv
COPY ./mainSimulationAccessTraces.csv /code/mainSimulationAccessTraces.csv

# 
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# 
COPY ./app /code/app

# 
CMD ["uvicorn", "app.api:app", "--proxy-headers", "--host", "0.0.0.0", "--port", "8000"]
