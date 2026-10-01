import { useRouter } from "expo-router";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Rise } from "@/components/ui/rise";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/txt";
import { GUTTER, colors } from "@/theme/tokens";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: GUTTER }}>
        <Rise>
          <Txt variant="displaySm">This page isn’t here.</Txt>
        </Rise>
        <Rise index={1}>
          <Txt variant="body" color={colors.inkSoft} style={{ marginTop: 10 }}>
            The link may be old, or the screen may have moved.
          </Txt>
        </Rise>
        <Rise index={2} style={{ marginTop: 22, alignSelf: "flex-start" }}>
          <Button label="Go to Home" height={52} onPress={() => router.replace("/")} />
        </Rise>
      </View>
    </Screen>
  );
}
