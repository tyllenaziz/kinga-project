import React, { useState } from 'react';
import { StyleSheet, View, Text, Alert, FlatList, Image, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { Button, Card, Title, Paragraph, Provider as PaperProvider, Appbar } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

// --- YOUR COMPUTER ADDRESS ---
const API_URL = 'http://10.1.0.51:5000'; 

export default function App() {
  const [view, setView] = useState('home'); 
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState('en'); 

  // Translations
  const txt = {
    en: { title: 'Kinga Pest Control', upload: 'Gallery', cam: 'Camera', hist: 'History', analyze: 'Analyze Pest', sw: 'Swahili', loading: 'Analyzing...', confidence: 'Confidence' },
    sw: { title: 'Kinga Wadudu', upload: 'Matunzio', cam: 'Kamera', hist: 'Historia', analyze: 'Chunguza', sw: 'English', loading: 'Inachunguza...', confidence: 'Uhakika' }
  };
  const t = txt[lang];

  // 1. Pick Image
  const pickImage = async (mode) => {
    let res;
    if (mode === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return Alert.alert("Permission needed", "Please allow camera access.");
      res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 1 });
    } else {
      res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 1 });
    }

    if (!res.canceled) {
      setImage(res.assets[0]);
      setResult(null); 
    }
  };

  // 2. Send to Python Server
  const analyze = async () => {
    if (!image) return;
    setLoading(true);
    
    const formData = new FormData();
    formData.append('file', { 
      uri: image.uri, 
      name: 'pest.jpg', 
      type: 'image/jpeg' 
    });

    try {
      const res = await axios.post(`${API_URL}/predict`, formData, { 
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
    } catch (e) {
      Alert.alert("Connection Error", "Check if your computer and phone are on the same Wi-Fi.");
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  // 3. Get History
  const loadHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/history`);
      setHistoryData(res.data);
      setView('history');
    } catch (e) { Alert.alert("Error", "Could not load history"); }
  };

  return (
    <PaperProvider>
      <SafeAreaView style={{flex: 1, backgroundColor: '#f0f0f0'}}>
        <Appbar.Header style={{backgroundColor: '#1b5e20'}}>
          <Appbar.Content title={t.title} color="white" />
          <Appbar.Action icon="translate" color="white" onPress={() => setLang(lang === 'en' ? 'sw' : 'en')} />
        </Appbar.Header>

        <View style={styles.container}>
          {view === 'home' && (
            <ScrollView>
              <Card style={styles.card}>
                {image ? (
                  <Card.Cover source={{ uri: image.uri }} style={{height: 300}} />
                ) : (
                  <View style={{height: 200, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e0e0e0'}}>
                    <Text style={{color: '#777'}}>No Image Selected</Text>
                  </View>
                )}
                <Card.Actions style={{justifyContent: 'space-around', padding: 15}}>
                  <Button icon="camera" mode="contained" onPress={() => pickImage('camera')} color="#1b5e20">{t.cam}</Button>
                  <Button icon="image" mode="outlined" onPress={() => pickImage('gallery')} color="#1b5e20">{t.upload}</Button>
                </Card.Actions>
              </Card>

              {image && !result && !loading && (
                <Button mode="contained" onPress={analyze} style={styles.analyzeBtn} labelStyle={{fontSize: 18}}>
                  {t.analyze}
                </Button>
              )}

              {loading && <ActivityIndicator size="large" color="#1b5e20" style={{marginTop: 20}} />}

              {result && (
                <Card style={styles.resultCard}>
                  <Card.Content>
                    <Title style={{color: '#1b5e20', fontSize: 24, fontWeight: 'bold'}}>
                      {lang === 'en' ? result.name.toUpperCase() : result.swahili_name.toUpperCase()}
                    </Title>
                    <Paragraph style={{marginBottom: 10, color: '#555'}}>
                      {t.confidence}: {result.confidence}
                    </Paragraph>
                    <Title style={{fontSize: 16}}>Recommendation:</Title>
                    <Paragraph>{lang === 'en' ? result.actions : result.swahili_actions}</Paragraph>
                  </Card.Content>
                </Card>
              )}

              <Button mode="text" onPress={loadHistory} style={{marginTop: 30}}>
                {t.hist}
              </Button>
            </ScrollView>
          )}

          {view === 'history' && (
            <View style={{flex: 1}}>
              <Button icon="arrow-left" mode="text" onPress={() => setView('home')} style={{alignSelf: 'flex-start'}}>
                Back
              </Button>
              <FlatList
                data={historyData}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                  <Card style={{marginVertical: 5, marginHorizontal: 10}}>
                    <Card.Title 
                      title={lang === 'en' ? item.name : item.swahili_name} 
                      subtitle={`${item.date} • ${item.confidence}`} 
                      left={(props) => <Appbar.Action {...props} icon="bug" />}
                    />
                  </Card>
                )}
              />
            </View>
          )}
        </View>
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  card: { marginBottom: 15, elevation: 4 },
  analyzeBtn: { backgroundColor: '#1b5e20', padding: 5, marginVertical: 10 },
  resultCard: { marginTop: 10, borderLeftWidth: 6, borderLeftColor: '#1b5e20', elevation: 4 }
});