import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors, typography, spacing, radii } from "../theme";
import { Icon } from "./ui/Icon";
import { captureException } from "../services/monitoring";

interface Props {
  children: React.ReactNode;
}
interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level crash guard. A render exception anywhere below would otherwise blank
 * the whole app (white screen); this catches it, shows a recoverable fallback,
 * and is the natural place to report to a crash service (Sentry) once wired.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    captureException(error, { componentStack: info.componentStack });
    console.error("Uncaught render error:", error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.container}>
        <Icon name="warning" size={48} color={colors.coral} />
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          The app hit an unexpected error. Try again — your progress is safe.
        </Text>
        <TouchableOpacity style={styles.button} onPress={this.reset} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing[8],
    gap: spacing[3],
  },
  title: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
    color: colors.text.primary,
    marginTop: spacing[2],
  },
  message: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
    textAlign: "center",
    lineHeight: typography.sizes.sm * 1.5,
  },
  button: {
    marginTop: spacing[4],
    backgroundColor: colors.amber,
    borderRadius: radii.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[8],
  },
  buttonText: {
    fontFamily: typography.families.bold,
    fontSize: typography.sizes.base,
    color: colors.text.inverse,
  },
});
