import { CloudArrowUp } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import showToast from "../../../../../utils/toast";
import System from "../../../../../models/system";
import { useDropzone } from "react-dropzone";
import { v4 } from "uuid";
import FileUploadProgress from "./FileUploadProgress";
import Workspace from "../../../../../models/workspace";
import debounce from "lodash.debounce";

export default function UploadFile({
  workspace,
  fetchKeys,
  setLoading,
  setLoadingMessage,
}) {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [files, setFiles] = useState([]);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [graphMode, setGraphMode] = useState(false);
  const [parseMethod, setParseMethod] = useState("auto");

  const handleSendLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoadingMessage("Scraping link...");
    setFetchingUrl(true);
    const formEl = e.target;
    const form = new FormData(formEl);
    const { response, data } = await Workspace.uploadLink(
      workspace.slug,
      form.get("link"),
      { graphMode }
    );
    if (!response.ok) {
      showToast(`Error uploading link: ${data.error}`, "error");
    } else {
      fetchKeys(true);
      showToast("Link uploaded successfully", "success");
      formEl.reset();
    }
    setLoading(false);
    setFetchingUrl(false);
  };

  // Queue all fetchKeys calls through the same debouncer to prevent spamming the server.
  // either a success or error will trigger a fetchKeys call so the UI is not stuck loading.
  const debouncedFetchKeys = debounce(() => fetchKeys(true), 1000);
  const handleUploadSuccess = () => debouncedFetchKeys();
  const handleUploadError = () => debouncedFetchKeys();

  const onDrop = async (acceptedFiles, rejections) => {
    const newAccepted = acceptedFiles.map((file) => {
      return {
        uid: v4(),
        file,
      };
    });
    const newRejected = rejections.map((file) => {
      return {
        uid: v4(),
        file: file.file,
        rejected: true,
        reason: file.errors[0].code,
      };
    });
    setFiles([...newAccepted, ...newRejected]);
  };

  useEffect(() => {
    async function checkProcessorOnline() {
      const online = await System.checkDocumentProcessorOnline();
      setReady(online);
    }
    checkProcessorOnline();
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    disabled: !ready,
  });

  return (
    <div>
      <div
        className={`w-[560px] border-dashed border-[2px] border-theme-modal-border light:border-[#686C6F] rounded-2xl bg-theme-bg-primary transition-colors duration-300 p-3 ${
          ready
            ? " light:bg-[#E0F2FE] cursor-pointer hover:bg-theme-bg-secondary light:hover:bg-transparent"
            : "cursor-not-allowed"
        }`}
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        {ready === false ? (
          <div className="flex flex-col items-center justify-center h-full">
            <CloudArrowUp className="w-8 h-8 text-white/80 light:invert" />
            <div className="text-white text-opacity-80 text-sm font-semibold py-1">
              {t("connectors.upload.processor-offline")}
            </div>
            <div className="text-white text-opacity-60 text-xs font-medium py-1 px-20 text-center">
              {t("connectors.upload.processor-offline-desc")}
            </div>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center">
            <CloudArrowUp className="w-8 h-8 text-white/80 light:invert" />
            <div className="text-white text-opacity-80 text-sm font-semibold py-1">
              {t("connectors.upload.click-upload")}
            </div>
            <div className="text-white text-opacity-60 text-xs font-medium py-1">
              {t("connectors.upload.file-types")}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 overflow-auto max-h-[180px] p-1 overflow-y-scroll no-scroll">
            {files.map((file) => (
              <FileUploadProgress
                key={file.uid}
                file={file.file}
                uuid={file.uid}
                setFiles={setFiles}
                slug={workspace.slug}
                rejected={file?.rejected}
                reason={file?.reason}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
                setLoading={setLoading}
                setLoadingMessage={setLoadingMessage}
                graphMode={graphMode}
                parseMethod={parseMethod}
              />
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-center mt-6 mb-4 px-4 w-full max-w-[560px] mx-auto">
        <label className="relative flex items-center justify-between p-4 rounded-xl border border-white/10 bg-theme-bg-secondary hover:bg-theme-bg-primary cursor-pointer transition-colors w-full group">
          <div className="flex flex-col">
            <span className="text-theme-text-primary text-sm font-semibold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" className="text-sky-400"><path d="M212.92,118.61a8,8,0,0,0-11.53,1.31L160,172.13,114.61,114a8,8,0,0,0-12.7,0L54.61,174.65a8,8,0,1,0,12.78,10.7L108,133.22,153.39,191a8,8,0,0,0,12.7,0l48.14-60.84A8,8,0,0,0,212.92,118.61ZM40,216a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0V208A8,8,0,0,1,40,216ZM224,48V200a8,8,0,0,1-16,0V48a8,8,0,0,1,16,0Z"></path></svg>
              {t("connectors.upload.advanced-graph-mode", "Advanced Graph Mode")}
            </span>
            <span className="text-theme-text-secondary text-xs mt-1">Extract deep relationship networks alongside traditional vectors</span>
          </div>
          <div className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${graphMode ? 'bg-sky-500' : 'bg-theme-modal-border'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${graphMode ? 'translate-x-[1.4rem]' : 'translate-x-1'}`} />
          </div>
          {/* hidden input for state */}
          <input
            type="checkbox"
            checked={graphMode}
            onChange={(e) => setGraphMode(e.target.checked)}
            className="sr-only"
          />
        </label>
      </div>

      {graphMode && (
        <div className="flex justify-center mb-4 px-4 w-full max-w-[560px] mx-auto animate-fade-in">
          <div className="w-full flex flex-col p-4 rounded-xl border border-white/10 bg-[#0c111d]/50">
            <label className="text-white text-sm font-semibold mb-2">Parsing Engine</label>
            <select
              value={parseMethod}
              onChange={(e) => setParseMethod(e.target.value)}
              className="bg-theme-settings-input-bg border hover:bg-theme-bg-secondary border-theme-modal-border text-white text-sm rounded-lg focus:ring-sky-500 focus:border-sky-500 block w-full p-2.5 outline-none transition-colors"
            >
              <option value="auto">Auto / MinerU (Best quality, Multi-modal)</option>
              <option value="pymupdf">PyMuPDF (Fast text-only, CPU friendly)</option>
              <option value="docling">Docling (Quality text-only)</option>
            </select>
            <span className="text-theme-text-secondary text-xs mt-2">
              MinerU requires a dedicated GPU for acceptable performance. Use PyMuPDF if running on a CPU.
            </span>
          </div>
        </div>
      )}

      <div className="text-center text-theme-text-secondary text-xs font-medium w-[560px] py-2">
        {t("connectors.upload.or-submit-link")}
      </div>
      <form onSubmit={handleSendLink} className="flex gap-x-2">
        <input
          disabled={fetchingUrl}
          name="link"
          type="url"
          className="border-none disabled:bg-theme-settings-input-bg disabled:text-theme-settings-input-placeholder bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-3/4 p-2.5"
          placeholder={t("connectors.upload.placeholder-link")}
          autoComplete="off"
        />
        <button
          disabled={fetchingUrl}
          type="submit"
          className="disabled:bg-white/20 disabled:text-slate-300 disabled:border-slate-400 disabled:cursor-wait bg bg-transparent hover:bg-slate-200 hover:text-slate-800 w-auto border border-theme-modal-border text-sm text-theme-text-primary p-2.5 rounded-lg"
        >
          {fetchingUrl
            ? t("connectors.upload.fetching")
            : t("connectors.upload.fetch-website")}
        </button>
      </form>
      <div className="mt-6 text-center text-theme-text-secondary w-[560px]">
        {t("connectors.upload.privacy-notice")}
      </div>
    </div>
  );
}
