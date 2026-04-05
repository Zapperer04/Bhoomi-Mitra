import requests

s = requests.Session()
data_1 = {"action": "WEATHER", "lang": "en"}
res_1 = s.post("http://localhost:5000/chat", json=data_1, headers={"X-Session-ID": "test_sess"})
print("1st Response:", res_1.json())

data_2 = {"action": "WEATHER_CITY", "value": "jaipur"}
res_2 = s.post("http://localhost:5000/chat", json=data_2, headers={"X-Session-ID": "test_sess"})
print("2nd Response:", res_2.json())
