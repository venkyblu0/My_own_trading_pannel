import React, { useState } from 'react';
import {
  X,
  KeyRound,
  ShieldCheck,
  Smartphone,
  Code2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  LogOut,
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';

type AuthMethod = 'token' | 'totp' | 'code';

export const ConnectUpstoxModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    isTokenSet,
    authUserName,
    authUserId,
    authSource,
    authExpiresAt,
    loginWithToken,
    loginWithTotp,
    loginWithAuthCode,
    disconnectAuth,
  } = useAppStore();

  const [activeMethod, setActiveMethod] = useState<AuthMethod>('token');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Direct Token state
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);

  // TOTP state
  const [apiKey, setApiKey] = useState('');
  const [pin, setPin] = useState('');
  const [totp, setTotp] = useState('');

  // Auth Code state
  const [authCode, setAuthCode] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState('http://localhost:3000');

  if (!isAuthModalOpen) return null;

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setErrorMessage('Please paste your Upstox Analytics or Access Token.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await loginWithToken(tokenInput.trim());
    setIsLoading(false);
    if (res.success) {
      setSuccessMessage('Token connected and saved securely to server session.');
      setTimeout(() => closeAuthModal(), 1200);
    } else {
      setErrorMessage(res.error || 'Failed to authenticate token.');
    }
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !pin.trim() || !totp.trim()) {
      setErrorMessage('Please fill in your API Key, 6-digit PIN, and 6-digit TOTP.');
      return;
    }
    if (pin.trim().length !== 6) {
      setErrorMessage("The 'pin' must be exactly 6 digits.");
      return;
    }
    if (totp.trim().length !== 6) {
      setErrorMessage("The 'totp' must be exactly 6 digits.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await loginWithTotp(apiKey.trim(), pin.trim(), totp.trim());
    setIsLoading(false);
    if (res.success) {
      setSuccessMessage('Successfully authenticated with Upstox TOTP API.');
      setTimeout(() => closeAuthModal(), 1200);
    } else {
      setErrorMessage(res.error || 'TOTP login failed. Check credentials and retry.');
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authCode.trim() || !clientId.trim() || !clientSecret.trim() || !redirectUri.trim()) {
      setErrorMessage('Please enter Auth Code, Client ID, Client Secret, and Redirect URI.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await loginWithAuthCode(authCode.trim(), clientId.trim(), clientSecret.trim(), redirectUri.trim());
    setIsLoading(false);
    if (res.success) {
      setSuccessMessage('Successfully generated token using Auth Code.');
      setTimeout(() => closeAuthModal(), 1200);
    } else {
      setErrorMessage(res.error || 'Auth code exchange failed.');
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    await disconnectAuth();
    setIsLoading(false);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="bg-[#12161C] border border-[#1F2630] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-12 border-b border-[#1F2630] px-4 flex items-center justify-between bg-[#181D25]">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#F0B90B]" />
            <h2 className="text-sm font-semibold text-[#E6EDF3]">
              Upstox API Authentication
            </h2>
          </div>
          <button
            onClick={closeAuthModal}
            className="text-[#8B949E] hover:text-[#E6EDF3] p-1 rounded hover:bg-[#1F2630] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Active Status Card */}
        {isTokenSet ? (
          <div className="p-4 bg-[#132B25] border-b border-[#26A69A]/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-[#26A69A] shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[#E6EDF3] flex items-center gap-1.5">
                  <span>Connected to Upstox</span>
                  {authUserName && (
                    <span className="text-[#26A69A]">({authUserName})</span>
                  )}
                </div>
                <div className="text-[11px] text-[#8B949E] font-mono mt-0.5">
                  Source: {authSource || 'Server Session'} · {authExpiresAt ? `Valid till ${authExpiresAt}` : 'Active'}
                </div>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={isLoading}
              className="px-2.5 py-1 text-xs bg-[#2E1A17] hover:bg-[#3D1E1A] text-[#EF5350] border border-[#EF5350]/30 rounded font-mono flex items-center gap-1 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              <span>Disconnect</span>
            </button>
          </div>
        ) : (
          <div className="p-3 bg-[#181D25] border-b border-[#1F2630] text-xs text-[#8B949E] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#F0B90B] shrink-0 mt-0.5" />
            <div>
              Upstox credentials are processed <strong>strictly on the Node server</strong> and cached locally for your session. Tokens are never exposed to browser scripts.
            </div>
          </div>
        )}

        {/* Method Tabs */}
        <div className="flex border-b border-[#1F2630] bg-[#12161C] text-xs font-mono">
          <button
            onClick={() => {
              setActiveMethod('token');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 transition-colors ${
              activeMethod === 'token'
                ? 'text-[#F0B90B] border-b-2 border-[#F0B90B] bg-[#181D25]'
                : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#181D25]/50'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Direct Token</span>
          </button>
          <button
            onClick={() => {
              setActiveMethod('totp');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 transition-colors ${
              activeMethod === 'totp'
                ? 'text-[#F0B90B] border-b-2 border-[#F0B90B] bg-[#181D25]'
                : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#181D25]/50'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>TOTP & PIN</span>
          </button>
          <button
            onClick={() => {
              setActiveMethod('code');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 transition-colors ${
              activeMethod === 'code'
                ? 'text-[#F0B90B] border-b-2 border-[#F0B90B] bg-[#181D25]'
                : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#181D25]/50'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Auth Code</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-[#2E1A17] border border-[#EF5350]/40 rounded text-[#EF5350] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-[#132B25] border border-[#26A69A]/40 rounded text-[#26A69A] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* METHOD 1: DIRECT TOKEN */}
          {activeMethod === 'token' && (
            <form onSubmit={handleTokenSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-[#8B949E] uppercase mb-1">
                  Upstox Analytics or Access Token
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Paste your 1-year Analytics Token or access_token..."
                    className="w-full bg-[#181D25] border border-[#1F2630] focus:border-[#F0B90B] rounded px-3 py-2 pr-9 font-mono text-xs text-[#E6EDF3] focus:outline-none placeholder:text-[#8B949E]/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2.5 top-2.5 text-[#8B949E] hover:text-[#E6EDF3]"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-[#8B949E] mt-1.5 leading-normal">
                  Recommended: Copy the <strong>1-Year Analytics Token</strong> from Upstox Developer Apps → Analytics tab (valid for 365 days, read-only).
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeAuthModal}
                  className="px-3 py-1.5 bg-[#181D25] hover:bg-[#1F2630] border border-[#1F2630] rounded text-xs text-[#8B949E] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-1.5 bg-[#F0B90B] hover:bg-[#d9a70a] text-[#0B0E11] font-semibold rounded text-xs flex items-center gap-1.5 transition-colors shadow"
                >
                  {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save & Connect</span>
                </button>
              </div>
            </form>
          )}

          {/* METHOD 2: TOTP LOGIN */}
          {activeMethod === 'totp' && (
            <form onSubmit={handleTotpSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-[#8B949E] uppercase mb-1">
                  App API Key (x-api-key)
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Your Upstox OAuth app API Key"
                  className="w-full bg-[#181D25] border border-[#1F2630] focus:border-[#F0B90B] rounded px-3 py-2 font-mono text-xs text-[#E6EDF3] focus:outline-none placeholder:text-[#8B949E]/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[#8B949E] uppercase mb-1">
                    6-Digit User PIN
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="123456"
                    className="w-full bg-[#181D25] border border-[#1F2630] focus:border-[#F0B90B] rounded px-3 py-2 font-mono text-xs text-[#E6EDF3] focus:outline-none tracking-widest placeholder:tracking-normal placeholder:text-[#8B949E]/60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#8B949E] uppercase mb-1">
                    6-Digit TOTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={totp}
                    onChange={(e) => setTotp(e.target.value)}
                    placeholder="Authenticator code"
                    className="w-full bg-[#181D25] border border-[#1F2630] focus:border-[#F0B90B] rounded px-3 py-2 font-mono text-xs text-[#E6EDF3] focus:outline-none tracking-widest placeholder:tracking-normal placeholder:text-[#8B949E]/60"
                  />
                </div>
              </div>

              <p className="text-[11px] text-[#8B949E] leading-normal">
                Calls <code>POST /v2/totp-login/authorization/token</code>. Token expires at 3:30 AM next day.
              </p>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeAuthModal}
                  className="px-3 py-1.5 bg-[#181D25] hover:bg-[#1F2630] border border-[#1F2630] rounded text-xs text-[#8B949E] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-1.5 bg-[#F0B90B] hover:bg-[#d9a70a] text-[#0B0E11] font-semibold rounded text-xs flex items-center gap-1.5 transition-colors shadow"
                >
                  {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Generate Token via TOTP</span>
                </button>
              </div>
            </form>
          )}

          {/* METHOD 3: AUTH CODE */}
          {activeMethod === 'code' && (
            <form onSubmit={handleCodeSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-[#8B949E] uppercase mb-1">
                  Authorization Code
                </label>
                <input
                  type="text"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="Code parameter received after login redirect..."
                  className="w-full bg-[#181D25] border border-[#1F2630] focus:border-[#F0B90B] rounded px-3 py-2 font-mono text-xs text-[#E6EDF3] focus:outline-none placeholder:text-[#8B949E]/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[#8B949E] uppercase mb-1">
                    Client ID / API Key
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="your_client_id"
                    className="w-full bg-[#181D25] border border-[#1F2630] focus:border-[#F0B90B] rounded px-3 py-2 font-mono text-xs text-[#E6EDF3] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#8B949E] uppercase mb-1">
                    Client Secret
                  </label>
                  <input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="your_client_secret"
                    className="w-full bg-[#181D25] border border-[#1F2630] focus:border-[#F0B90B] rounded px-3 py-2 font-mono text-xs text-[#E6EDF3] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#8B949E] uppercase mb-1">
                  Redirect URI
                </label>
                <input
                  type="text"
                  value={redirectUri}
                  onChange={(e) => setRedirectUri(e.target.value)}
                  placeholder="e.g. http://localhost:3000"
                  className="w-full bg-[#181D25] border border-[#1F2630] focus:border-[#F0B90B] rounded px-3 py-2 font-mono text-xs text-[#E6EDF3] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeAuthModal}
                  className="px-3 py-1.5 bg-[#181D25] hover:bg-[#1F2630] border border-[#1F2630] rounded text-xs text-[#8B949E] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-1.5 bg-[#F0B90B] hover:bg-[#d9a70a] text-[#0B0E11] font-semibold rounded text-xs flex items-center gap-1.5 transition-colors shadow"
                >
                  {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Exchange Code for Token</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
