import { useUniwind } from "uniwind";
import { googleLogoPaths, type GoogleSignInButtonDesignProps } from "./google-sign-in-button-design";
import "./google-sign-in-button.css";

export function GoogleSignInButtonAppearance({ disabled, loading, label, onPress }: GoogleSignInButtonDesignProps) {
  const { theme } = useUniwind();

  return (
    <button
      type="button"
      className="coreply-google-sign-in"
      data-theme={theme}
      disabled={disabled}
      aria-busy={loading}
      onClick={onPress}
    >
      <span className="coreply-google-sign-in-state" aria-hidden="true" />
      <span className="coreply-google-sign-in-content">
        <svg className="coreply-google-sign-in-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
          {googleLogoPaths.map((path) => <path key={path.fill} {...path} />)}
        </svg>
        <span className="coreply-google-sign-in-label">{label}</span>
      </span>
    </button>
  );
}
