import React, { useState } from 'react';
import { StyleSheet, View, Text, Alert, ScrollView, FlatList, Linking, ActivityIndicator, Platform, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Button, Card, Title, Paragraph, Provider as PaperProvider, Appbar, Avatar, List, TextInput as PaperInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import axios from 'axios';

// --- CONFIGURATION ---
const API_URL = 'http://10.1.0.51:5000'; 
const EXPERT_PHONE = '255700000000'; 

// --- HELPER COMPONENT (Black Input Text) ---
const AuthInput = ({label, val, setVal, isPass=false}: any) => {
  const [showPass, setShowPass] = useState(false);
  
  return (
    <View style={{marginBottom: 15}}>
      <PaperInput
        label={label}
        value={val}
        onChangeText={setVal}
        secureTextEntry={isPass && !showPass}
        mode="outlined"
        textColor="black"             
        outlineColor="black"          
        activeOutlineColor="#1b5e20"
        style={{backgroundColor: 'white'}} 
        right={isPass ? <PaperInput.Icon icon={showPass ? "eye-off" : "eye"} onPress={() => setShowPass(!showPass)} /> : null}
      />
    </View>
  );
};

export default function KingaApp() {
  // --- STATES ---
  const [view, setView] = useState<string>('auth_login'); 
  const [user, setUser] = useState<any>(null); 

  // Form Data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // App Data
  const [image, setImage] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [lang, setLang] = useState<'en' | 'sw'>('en'); 

  const t = {
    en: { 
      title: 'Kinga', sub: 'Smart Crop Protection', upload: 'Gallery', cam: 'Camera', 
      hist: 'History', analyze: 'Analyze Pest', sw: 'Swahili', loading: 'Analyzing...', 
      conf: 'Confidence', listen: 'Listen', expert: 'Chat with Expert', 
      cause: 'Causes', effect: 'Effects', sol: 'Solutions', unknown: 'Unknown Object',
      login: 'Login', signup: 'Sign Up', verify: 'Verify Email', forgot: 'Forgot Password?', reset: 'Reset Password',
      email: 'Email Address', pass: 'Password', name: 'Full Name', code: '6-Digit Code', newPass: 'New Password'
    },
    sw: { 
      title: 'Kinga', sub: 'Ulinzi wa Mazao', upload: 'Matunzio', cam: 'Kamera', 
      hist: 'Historia', analyze: 'Chunguza', sw: 'English', loading: 'Inachunguza...', 
      conf: 'Uhakika', listen: 'Sikiliza', expert: 'Chati na Mtaalamu', 
      cause: 'Sababu', effect: 'Madhara', sol: 'Suluhisho', unknown: 'Haijulikani',
      login: 'Ingia', signup: 'Jisajili', verify: 'Thibitisha Barua Pepe', forgot: 'Umesahau Nenosiri?', reset: 'Weka Nenosiri Jipya',
      email: 'Barua Pepe', pass: 'Nenosiri', name: 'Jina Kamili', code: 'Namba ya Siri (6)', newPass: 'Nenosiri Jipya'
    }
  }[lang];

  // --- AUTH FUNCTIONS ---
  const handleSignup = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/signup`, { fullName, email, password });
      Alert.alert("Success", "Verification code sent to your email.");
      setView('auth_verify');
    } catch (e: any) { Alert.alert("Error", e.response?.data?.error || "Signup Failed"); }
    finally { setLoading(false); }
  };

  const handleVerify = async () => {
    try {
      await axios.post(`${API_URL}/verify`, { email, otp });
      Alert.alert("Success", "Account Verified! Please Login.");
      setView('auth_login');
    } catch (e: any) { Alert.alert("Error", "Invalid Code"); }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/login`, { email, password });
      setUser(res.data);
      setView('home');
      setEmail(''); setPassword('');
    } catch (e: any) { Alert.alert("Error", e.response?.data?.error || "Login Failed"); }
    finally { setLoading(false); }
  };

  const handleForgot = async () => {
    if(!email) return Alert.alert("Required", "Please enter your email first.");
    setLoading(true);
    try {
      await axios.post(`${API_URL}/forgot-password`, { email });
      Alert.alert("Sent", "Check your email for the code.");
      setView('auth_reset');
    } catch (e) { Alert.alert("Error", "Email not found"); }
    finally { setLoading(false); }
  };

  const handleReset = async () => {
    try {
      await axios.post(`${API_URL}/reset-password`, { email, otp, newPassword });
      Alert.alert("Success", "Password changed. Please Login.");
      setView('auth_login');
    } catch (e) { Alert.alert("Error", "Invalid Code"); }
  };

  const logout = () => {
    setUser(null);
    setView('auth_login');
    setImage(null);
    setResult(null);
  };

  // --- APP FUNCTIONS ---
  const pickImage = async (mode: string) => {
    let res: ImagePicker.ImagePickerResult;
    if (mode === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert("Permission needed"); return; }
      res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 1 });
    } else {
      res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 1 });
    }
    if (!res.canceled) { setImage(res.assets[0]); setResult(null); }
  };

  const analyze = async () => {
    if (!image) return;
    setLoading(true);
    const formData = new FormData();
    // @ts-ignore
    formData.append('file', { uri: image.uri, name: 'pest.jpg', type: 'image/jpeg' });
    try {
      const res = await axios.post(`${API_URL}/predict`, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      setResult(res.data);
    } catch (e) { Alert.alert("Error", "Connection failed."); } 
    finally { setLoading(false); }
  };

  const loadHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/history`);
      setHistoryData(res.data);
      setView('history');
    } catch (e) { Alert.alert("Error", "Could not load history"); }
  };

  const speak = () => {
    if (!result) return;
    const text = lang === 'en' ? result.actions : result.swahili_actions;
    Speech.speak(text, { language: lang === 'en' ? 'en-US' : 'sw-TZ' });
  };

  const openWhatsApp = () => {
    Linking.openURL(`https://wa.me/${EXPERT_PHONE}`);
  };

  // --- RENDERING ---
  return (
    <PaperProvider>
      <Appbar.Header style={{backgroundColor: '#1b5e20'}}>
        <Appbar.Content title={t.title} subtitle={user ? user.name : t.sub} color="white" />
        <Appbar.Action icon="translate" color="white" onPress={() => setLang(lang === 'en' ? 'sw' : 'en')} />
        {user && <Appbar.Action icon="logout" color="white" onPress={logout} />}
      </Appbar.Header>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{flex: 1, backgroundColor: '#f4f4f4'}}
      >
        <View style={styles.container}>
            
            {/* === SCROLLABLE SCREENS (Login, Signup, Home) === */}
            {(view !== 'history') && (
              <ScrollView contentContainerStyle={{flexGrow: 1}} showsVerticalScrollIndicator={false}>
                
                {view === 'auth_login' && (
                  <View style={styles.authContainer}>
                    <Avatar.Icon size={80} icon="lock" style={{alignSelf:'center', marginBottom:20, backgroundColor:'#1b5e20'}} />
                    <Title style={styles.authTitle}>{t.login}</Title>
                    <AuthInput label={t.email} val={email} setVal={setEmail} />
                    <AuthInput label={t.pass} val={password} setVal={setPassword} isPass={true} />
                    <Button mode="contained" onPress={handleLogin} loading={loading} style={styles.authBtn}>{t.login}</Button>
                    <View style={{flexDirection:'row', justifyContent:'space-between', marginTop: 10}}>
                      <Button onPress={() => setView('auth_signup')}>{t.signup}</Button>
                      <Button onPress={() => setView('auth_forgot')}>{t.forgot}</Button>
                    </View>
                  </View>
                )}

                {view === 'auth_signup' && (
                  <View style={styles.authContainer}>
                    <Title style={styles.authTitle}>{t.signup}</Title>
                    <AuthInput label={t.name} val={fullName} setVal={setFullName} />
                    <AuthInput label={t.email} val={email} setVal={setEmail} />
                    <AuthInput label={t.pass} val={password} setVal={setPassword} isPass={true} />
                    <Button mode="contained" onPress={handleSignup} loading={loading} style={styles.authBtn}>{t.signup}</Button>
                    <Button onPress={() => setView('auth_login')}>{t.login}</Button>
                  </View>
                )}

                {view === 'auth_verify' && (
                  <View style={styles.authContainer}>
                    <Title style={styles.authTitle}>{t.verify}</Title>
                    <Paragraph style={{textAlign:'center', marginBottom:20}}>Enter code sent to {email}</Paragraph>
                    <AuthInput label={t.code} val={otp} setVal={setOtp} />
                    <Button mode="contained" onPress={handleVerify} style={styles.authBtn}>Verify Account</Button>
                  </View>
                )}

                {view === 'auth_forgot' && (
                  <View style={styles.authContainer}>
                    <Title style={styles.authTitle}>Reset Password</Title>
                    <AuthInput label={t.email} val={email} setVal={setEmail} />
                    <Button mode="contained" onPress={handleForgot} loading={loading} style={styles.authBtn}>Send Code</Button>
                    <Button onPress={() => setView('auth_login')}>Cancel</Button>
                  </View>
                )}

                {view === 'auth_reset' && (
                  <View style={styles.authContainer}>
                    <Title style={styles.authTitle}>{t.reset}</Title>
                    <AuthInput label={t.code} val={otp} setVal={setOtp} />
                    <AuthInput label={t.newPass} val={newPassword} setVal={setNewPassword} isPass={true} />
                    <Button mode="contained" onPress={handleReset} style={styles.authBtn}>Change Password</Button>
                  </View>
                )}

                {view === 'home' && user && (
                  <View>
                    <Card style={styles.card}>
                      {image ? (
                        <Card.Cover source={{ uri: image.uri }} style={{height: 250}} />
                      ) : (
                        <View style={styles.placeholder}>
                          <Avatar.Icon size={80} icon="leaf" style={{backgroundColor: '#e8f5e9'}} color='#1b5e20' />
                          <Text style={{color: '#888', marginTop: 10}}>Select an image</Text>
                        </View>
                      )}
                      <Card.Actions style={styles.actions}>
                        <Button icon="camera" mode="contained" onPress={() => pickImage('camera')} buttonColor="#1b5e20">{t.cam}</Button>
                        <Button icon="image" mode="outlined" onPress={() => pickImage('gallery')} textColor="#1b5e20">{t.upload}</Button>
                      </Card.Actions>
                    </Card>

                    {image && !result && !loading && (
                      <Button mode="contained" onPress={analyze} style={styles.analyzeBtn} labelStyle={{fontSize: 18}}>{t.analyze}</Button>
                    )}

                    {loading && <ActivityIndicator size="large" color="#1b5e20" style={{margin: 20}} />}

                    {result && (
                      <Card style={styles.resultCard}>
                        <Card.Content>
                          <Title style={styles.pestName}>{lang === 'en' ? result.name : result.swahili_name}</Title>
                          <View style={{backgroundColor:'#1b5e20', padding:5, borderRadius:5, alignSelf:'flex-start', marginBottom:10}}>
                            <Text style={{color:'white'}}>{result.confidence}</Text>
                          </View>
                          
                          <List.AccordionGroup>
                            <List.Accordion title={t.cause} id="1"><Paragraph style={styles.detailsText}>{lang==='en'?result.causes:result.swahili_causes}</Paragraph></List.Accordion>
                            <List.Accordion title={t.effect} id="2"><Paragraph style={styles.detailsText}>{lang==='en'?result.effects:result.swahili_effects}</Paragraph></List.Accordion>
                            <List.Accordion title={t.sol} id="3" expanded={true}><Paragraph style={styles.detailsText}>{lang==='en'?result.actions:result.swahili_actions}</Paragraph></List.Accordion>
                          </List.AccordionGroup>

                          <Button icon="volume-high" mode="elevated" onPress={speak} style={{marginTop:10}}>{t.listen}</Button>
                          <Button icon="whatsapp" mode="contained" onPress={openWhatsApp} buttonColor="#25D366" style={{marginTop:10}}>{t.expert}</Button>
                        </Card.Content>
                      </Card>
                    )}
                    <Button mode="text" onPress={loadHistory} style={{marginTop: 20}} textColor="#555">{t.hist}</Button>
                  </View>
                )}
              </ScrollView>
            )}

            {/* === NON-SCROLLABLE SCREENS (History) === */}
            {view === 'history' && (
              <View style={{flex: 1}}>
                <Button icon="arrow-left" mode="text" onPress={() => setView('home')} style={{alignSelf: 'flex-start'}} textColor="black">Back</Button>
                <FlatList
                  data={historyData}
                  keyExtractor={(item: any) => item.id.toString()}
                  contentContainerStyle={{paddingBottom: 20}}
                  renderItem={({ item }: { item: any }) => (
                    <Card style={{margin: 5, backgroundColor: 'white'}}>
                      <Card.Title 
                        title={lang === 'en' ? item.name : item.swahili_name} 
                        subtitle={item.date} 
                        titleStyle={{ color: 'black', fontWeight: 'bold' }} 
                        subtitleStyle={{ color: 'black' }}
                      />
                    </Card>
                  )}
                />
              </View>
            )}

        </View>
      </KeyboardAvoidingView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  card: { marginBottom: 15, backgroundColor: 'white', borderRadius: 10 },
  placeholder: { height: 250, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  actions: { justifyContent: 'space-around', padding: 10 },
  analyzeBtn: { backgroundColor: '#1b5e20', padding: 6, marginVertical: 10, borderRadius: 30 },
  resultCard: { marginTop: 5, borderRadius: 15, elevation: 3, backgroundColor: 'white' },
  pestName: { color: '#1b5e20', fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  detailsText: { padding: 10, backgroundColor: '#f9f9f9', color: '#444' },
  // Auth Styles
  authContainer: { flex: 1, justifyContent: 'center', padding: 10, marginTop: 40 },
  authTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#1b5e20' },
  authBtn: { backgroundColor: '#1b5e20', marginTop: 10, padding: 5 }
});