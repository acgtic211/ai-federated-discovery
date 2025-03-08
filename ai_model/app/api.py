from fastapi import FastAPI
import pickle
import numpy as np
from numpy import array
import tensorflow as tf
from keras.preprocessing.text import one_hot
from keras_preprocessing.sequence import pad_sequences
import importlib
import model_training
import io
import os

app = FastAPI()

global_accuracy = model_training.accuracy
prediction_count = 1
total_confidence = model_training.accuracy  # Initialize with the initial accuracy

@app.on_event("startup")
def load_model():
    global model
    model = model_training.model
    global_accuracy = model_training.accuracy
    total_confidence = model_training.accuracy


@app.get('/')
def index():
    return {'message': 'This is the homepage of the API '}

@app.get('/retrain')
def retrain_model():
    if model_training.finished:
      importlib.reload(model_training)
      load_model()
      global_accuracy = model_training.accuracy
      total_confidence = model_training.accuracy
      prediction_count = 1
      return {'message': 'Model retrained with accuracy ' + str(model_training.accuracy*100) + '% and loss ' + str(model_training.loss*100) + '%'}
    else:
        return {'message': 'Model is already training'}
    
@app.get('/metrics')
def get_metrics():
    return {'message': 'Model current accuracy ' + str("{:.2f}".format(global_accuracy*100)) + '%' }


@app.get('/predict/{sentence}')

def get_device(sentence: str):
    
    if os.getenv('DOCUMENT') == 'traces2_7.csv':
        return {'prediction': []}

    #received = data.dict()
    global global_accuracy, prediction_count, total_confidence
    pred_name = getRecommendations2(sentence, model)
    confidence_str = pred_name[0][0].split('(')[-1].strip(')')  # Extract confidence from the string
    confidence = float(confidence_str)
    print(pred_name)
    
    # Update global accuracy
    prediction_count += 1
    total_confidence += confidence
    global_accuracy = total_confidence / prediction_count
                                
    return {'prediction': pred_name}

def getRecommendations2(sentence, model):
    encoded_docs2 = [one_hot(sentence, 250)]
    padded_docs2 = pad_sequences(encoded_docs2, maxlen=9, padding='post')
    y_pred = model.predict(array(padded_docs2))
    encoder = model_training.encoder

    print(np.argmax(y_pred, axis=1))
    #ind=np.argpartition(y_pred[0], -4)[-4:]
    #print(ind[np.argsort(-1*y_pred[0][ind])])
    #print(y_pred[0][ind[np.argsort(-1*y_pred[0][ind])]])

    results = []
    for sentence in y_pred:
        partialResult = []
        if len(sentence) < 4:
            ind = np.argsort(-1*sentence)[:len(sentence)]
        else:
            ind=np.argpartition(sentence, -4)[-4:]
            ind=ind[np.argsort(-1*sentence[ind])]
        for result in ind:
          partialResult.append(str(encoder.inverse_transform([result])) + ' (' + str(sentence[result]) + ')')
        results.append(partialResult)
    print(results)
    return results