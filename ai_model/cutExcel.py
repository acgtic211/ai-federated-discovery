import pandas as pd

# Read the CSV file
df = pd.read_csv('mainSimulationAccessTraces.csv')

# Filter the rows based on the condition
valid_locations = ["Bedroom", "room_10"]
df = df[df['destinationLocation'].isin(valid_locations)]

# Save the updated CSV file
df.to_csv('traces2_1.csv', index=False)