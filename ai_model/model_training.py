import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from keras.models import load_model

import os
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from sklearn.model_selection import train_test_split
from keras.layers import Dropout
from numpy import array
from keras.preprocessing.text import one_hot
from keras_preprocessing.sequence import pad_sequences
from sklearn.preprocessing import LabelEncoder
from dotenv import load_dotenv
from sklearn.utils import resample

import pickle
import json

class TransformerBlock(layers.Layer):
    def __init__(self, embed_dim, num_heads, ff_dim, rate=0.1):
        super(TransformerBlock, self).__init__()
        self.att = layers.MultiHeadAttention(num_heads=num_heads, key_dim=embed_dim)
        self.ffn = keras.Sequential(
            [layers.Dense(ff_dim, activation="relu"), layers.Dense(embed_dim),]
        )
        self.layernorm1 = layers.LayerNormalization(epsilon=1e-6)
        self.layernorm2 = layers.LayerNormalization(epsilon=1e-6)
        self.dropout1 = layers.Dropout(rate)
        self.dropout2 = layers.Dropout(rate)

    def call(self, inputs, training):
        attn_output = self.att(inputs, inputs)
        attn_output = self.dropout1(attn_output, training=training)
        out1 = self.layernorm1(inputs + attn_output)
        ffn_output = self.ffn(out1)
        ffn_output = self.dropout2(ffn_output, training=training)
        return self.layernorm2(out1 + ffn_output)


class TokenAndPositionEmbedding(layers.Layer):
    def __init__(self, maxlen, vocab_size, embed_dim):
        super(TokenAndPositionEmbedding, self).__init__()
        self.token_emb = layers.Embedding(input_dim=vocab_size, output_dim=embed_dim)
        self.pos_emb = layers.Embedding(input_dim=maxlen, output_dim=embed_dim)

    def call(self, x):
        maxlen = tf.shape(x)[-1]
        positions = tf.range(start=0, limit=maxlen, delta=1)
        positions = self.pos_emb(positions)
        x = self.token_emb(x)
        return x + positions

"""## Download and prepare dataset"""
load_dotenv()
finished=False
vocab_size = 250
df = pd.read_csv(os.getenv('DOCUMENT'))

print("Training model with data from " + os.getenv('DOCUMENT'))

# Normalize the dataset to have the same number of samples for each category
if os.getenv('DOCUMENT') == 'traces2_1.csv':
    df = df[~df['destinationServiceType'].isin(['/sensorService', '/smartPhone', '/batteryService', '/movementSensor'])]
elif os.getenv('DOCUMENT') == 'traces2_5.csv':
    df = df[~df['destinationServiceType'].isin(['/sensorService', '/smartPhone', '/movementSensor'])]
    category_counts = df['destinationServiceType'].value_counts()
    min_count = category_counts.min()

    balanced_dfs = []
    for category in category_counts.index:
        category_df = df[df['destinationServiceType'] == category]
        if len(category_df) > min_count:
             # Frequent categories are downsampled
             category_df = resample(category_df, replace=False, n_samples=min_count, random_state=42)
        else:
            # Infrequent categories are upsampled
             category_df = resample(category_df, replace=True, n_samples=min_count, random_state=42)
        balanced_dfs.append(category_df)

    # Combine datasets
    df = pd.concat(balanced_dfs)
elif os.getenv('DOCUMENT') == 'mainSimulationAccessTraces.csv':
    df = df[~df['destinationServiceType'].isin(['/smartPhone', '/sensorService'])]

else:
    df = df[~df['destinationServiceType'].isin(['/sensorService', '/smartPhone', '/batteryService'])]

# category_counts = df['destinationServiceType'].value_counts()
# min_count = category_counts.min()

# balanced_dfs = []
# for category in category_counts.index:
#     category_df = df[df['destinationServiceType'] == category]
#     if len(category_df) > min_count:
#         # Frequent categories are downsampled
#         category_df = resample(category_df, replace=False, n_samples=min_count, random_state=42)
#     else:
#         # Infrequent categories are upsampled
#         category_df = resample(category_df, replace=True, n_samples=min_count, random_state=42)
#     balanced_dfs.append(category_df)

# Combine datasets
#df = pd.concat(balanced_dfs)

#df = df[~df['destinationServiceType'].isin(['/batteryService', '/movementSensor', '/sensorService'])] # remove rows where destinationServiceType is /batteryService, /thermostat or /movementSensor
#df = df[~df['destinationServiceType'].isin(['/sensorService'])] # remove rows where destinationServiceType is /sensorService
data = df[['destinationServiceType', 'destinationLocation', 'operation']]
sentences = []
for service, location, operation in data.itertuples(index=False):
  sentences.append("I need to " + operation + " " + service[1:] + " in " + location)
encoder = LabelEncoder()
labels = encoder.fit_transform(df['accessedNodeAddress'])

encoded_docs = [one_hot(d, vocab_size) for d in sentences]
print(encoded_docs)

max_length = 9
padded_docs = pad_sequences(encoded_docs, maxlen=max_length, padding='post')
print(padded_docs)

#np.random.shuffle(padded_docs)
#np.random.shuffle(labels)
x_train, x_val, y_train, y_val = train_test_split(padded_docs, labels, test_size=0.25, random_state=42)

"""## Create classifier model using transformer layer

Transformer layer outputs one vector for each time step of our input sequence.
Here, we take the mean across all time steps and
use a feed forward network on top of it to classify text.
"""

embed_dim = 128  # Embedding size for each token
num_heads = 2  # Number of attention heads
ff_dim = 128  # Hidden layer size in feed forward network inside transformer

if os.getenv('DOCUMENT') == 'traces2_5.csv':
    embed_dim = 256
    num_heads = 2 
    ff_dim = 256

inputs = layers.Input(shape=(max_length,))
embedding_layer = TokenAndPositionEmbedding(max_length, vocab_size, embed_dim)
x = embedding_layer(inputs)
transformer_block = TransformerBlock(embed_dim, num_heads, ff_dim)
x = transformer_block(x)
x = layers.GlobalAveragePooling1D()(x)
# x = layers.Dropout(0.1)(x)
x = layers.Dropout(0.1)(x)
#x = layers.Dense(16, activation="relu")(x)
if os.getenv('DOCUMENT') == 'traces2_5.csv':
    x = layers.Dense(512, activation="relu")(x)
    x = layers.Dropout(0.5)(x)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(0.5)(x)
else:
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(0.5)(x)
    x = layers.Dense(128, activation="relu")(x)
    x = layers.Dropout(0.5)(x)
# x = layers.Dropout(0.1)(x)
outputs = layers.Dense(len(set(labels)), activation="softmax")(x)

model = keras.Model(inputs=inputs, outputs=outputs)
print(model.summary())

"""## Train and Evaluate"""

model.compile(
    optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"]
)
history = model.fit(
    x_train, y_train, batch_size=5000, epochs=10, validation_data=(x_val, y_val)
)

#pd.DataFrame(history.history).plot(figsize=(8,5))
#plt.grid(True)
#plt.gca().set_ylim(0,1)
#plt.show()
loss, accuracy = model.evaluate(x_train, y_train, verbose=0)
print('Accuracy: %f' % (accuracy*100))
finished=True
