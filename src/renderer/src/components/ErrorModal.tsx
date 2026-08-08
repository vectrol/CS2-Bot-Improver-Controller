import { AlertTriangle, X } from "lucide-react";
import { useI18n } from "../i18n";

const KNOWN: Record<string, string> = {
  "cs2 running": "install.warning",
  "cs2 already running": "mode.running",
  "steam not running": "mode.steamNotRunning",
  "csgo directory not set": "home.noDir",
  "bundled package missing": "install.pkgMissing",
  "empty package": "install.pkgMissing",
};

export default function ErrorModal({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  if (!message) return null;
  const key = KNOWN[message];
  const text = key ? t(key) : message;
  return (
    <div className="modal-backdrop fade-in" onClick={onClose}>
      <div className="modal error-modal" onClick={(e) => e.stopPropagation()}>
        <div className="error-modal__icon">
          <AlertTriangle size={22} />
        </div>
        <div className="error-modal__body">
          <div className="error-modal__title">{t("error.title")}</div>
          <div className="error-modal__msg">{text}</div>
        </div>
        <button className="btn btn--ghost btn--sm" onClick={onClose}>
          <X size={13} />
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}
