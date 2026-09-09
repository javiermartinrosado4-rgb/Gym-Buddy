import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const secureKey = (key: string) => `community.${Array.from(key, c => c.charCodeAt(0).toString(16).padStart(4, "0")).join("")}`;
export const communitySession = {
  async getItem(key: string) {
    const saved = await SecureStore.getItemAsync(secureKey(key));
    if (saved) return saved;
    const legacy = await AsyncStorage.getItem(key);
    if (legacy) {
      await SecureStore.setItemAsync(secureKey(key), legacy);
      await AsyncStorage.removeItem(key);
    }
    return legacy;
  },
  async setItem(key: string, value: string) {
    await SecureStore.setItemAsync(secureKey(key), value);
    await AsyncStorage.removeItem(key);
  },
  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(secureKey(key));
    await AsyncStorage.removeItem(key);
  },
};
