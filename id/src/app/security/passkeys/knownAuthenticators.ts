// The aaguid from the registration response can be used to determine the
// authenticator type. We map known authenticators to their names here for
// display purposes.
//
// Sourced from: https://github.com/passkeydeveloper/passkey-authenticator-aaguids

const knownAuthenticators: Record<string, string> = {
  "08987058-cadc-4b81-b6e1-30de50dcbe96": "Windows Hello",
  "0ea242b4-43c4-4a1b-8b17-dd6d0b6baec6": "Keeper",
  "17290f1e-c212-34d0-1423-365d729f09d9": "Thales PIN iOS",
  "22248c4c-7a12-46e2-9a41-44291b373a4d": "LogMeOnce",
  "39a5647e-1853-446c-a1f6-a79bae9f5bc7": "IDmelon",
  "50726f74-6f6e-5061-7373-50726f746f6e": "Proton Pass",
  "531126d6-e717-415c-9320-3d9aa6981239": "Dashlane",
  "53414d53-554e-4700-0000-000000000000": "Samsung Pass",
  "6028b017-b1d4-4c02-b4b3-afcdafc96bb2": "Windows Hello",
  "66a0ccb3-bd6a-191f-ee06-e375c50b9846": "Thales Bio iOS",
  "771b48fd-d3d4-4f74-9232-fc157ab0507a": "Edge on Mac",
  "8836336a-f590-0921-301d-46427531eee6": "Thales Bio Android",
  "891494da-2c90-4d31-a9cd-4eab0aed1309": "Sésame",
  "9ddd1817-af5a-4672-a2b9-3e3dd95000a9": "Windows Hello",
  "a10c6dd9-465e-4226-8198-c7c44b91c555": "Kaspersky Password Manager",
  "adce0002-35bc-c60a-648b-0b25f1f05503": "Chrome on Mac",
  "b35a26b2-8f6e-4697-ab1d-d44db4da28c6": "Zoho Vault",
  "b5397666-4885-aa6b-cebf-e52262a439a2": "Chromium Browser",
  "b78a0a55-6ef8-d246-a042-ba0f6d55050c": "LastPass",
  "b84e4048-15dc-4dd0-8640-f4f60813c8af": "NordPass",
  "bada5566-a7aa-401f-bd96-45619a55120d": "1Password",
  "bfc748bb-3429-4faa-b9f9-7cfa9f3b76d0": "iPasswords",
  "cc45f64e-52a2-451b-831a-4edd8022a202": "ToothPic Passkey Provider",
  "cd69adb5-3c7a-deb9-3177-6800ea6cb72a": "Thales PIN Android",
  "d548826e-79b4-db40-a3d8-11116f7e8349": "Bitwarden",
  "dd4ec289-e01d-41c9-bb89-70fa845d4bf2": "iCloud Keychain",
  "de503f9c-21a4-4f76-b4b7-558eb55c6f89": "Devolutions",
  "ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4": "Google Password Manager",
  "f3809540-7f14-49c1-a8b3-8f813b225541": "Enpass",
  "fbfc3007-154e-4ecc-8c0b-6e020557d7bd": "iCloud Keychain",
  "fdb141b2-5d84-443e-8a35-4698c205a502": "KeePassXC",
};

export default knownAuthenticators;
