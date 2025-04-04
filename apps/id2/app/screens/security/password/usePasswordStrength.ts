import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import * as zxcvbnEnPackage from "@zxcvbn-ts/language-en";
import { useEffect, useState } from "react";
import { zxcvbnAsync, zxcvbnOptions } from "@zxcvbn-ts/core";
import { useAuth } from "@/auth/authContext";

export function usePasswordStrength(password: string) {
  const [strength, setStrength] = useState<number>(0);

  useEffect(() => {
    if (!password) {
      return;
    }

    zxcvbnAsync(password).then((result) => {
      setStrength(result.score);
    });
  }, [password]);

  return strength;
}

export function useZxcvbnConfig() {
  const user = useAuth();

  useEffect(() => {
    const options = {
      translations: zxcvbnEnPackage.translations,
      graphs: zxcvbnCommonPackage.adjacencyGraphs,
      dictionary: {
        ...zxcvbnCommonPackage.dictionary,
        ...zxcvbnEnPackage.dictionary,
        userInputs: [
          "noo",
          "noomail",
          "noo.eu",
          ...user.firstName.split(" "),
          ...(user.lastName?.split(" ") ?? []),
          user.normalizedUsername,
          user.username,
          user.tenantDomain ?? "",
        ],
      },
      useLevenshteinDistance: true,
    };

    zxcvbnOptions.setOptions(options);
  }, [
    user.firstName,
    user.lastName,
    user.normalizedUsername,
    user.username,
    user.tenantDomain,
  ]);
}
