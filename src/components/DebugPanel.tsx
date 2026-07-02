import type { ApiResult, ServiceStatus } from "../api/client";

type DebugPanelProps = {
  gatewayBaseUrl: string;
  envVarName: string;
  healthStatus: ServiceStatus;
  healthResponse: ApiResult<unknown> | null;
  onCheckHealth: () => void;
};

export function DebugPanel({
  gatewayBaseUrl,
  envVarName,
  healthStatus,
  healthResponse,
  onCheckHealth
}: DebugPanelProps) {
  return (
    <section className="page-section">
      <div className="section-heading section-row">
        <div>
          <h2>API Debug Panel</h2>
          <p>Central API configuration and raw response inspection for classroom testing.</p>
        </div>
        <button className="secondary-button" onClick={onCheckHealth} type="button">
          Health Check
        </button>
      </div>

      <div className="panel">
        <p><strong>Gateway API base URL:</strong> {gatewayBaseUrl}</p>
        <p><strong>Frontend env var:</strong> {envVarName}</p>
        <p><strong>Health status:</strong> {healthStatus}</p>
        <details>
          <summary>Raw JSON response</summary>
          <pre>{JSON.stringify(healthResponse, null, 2)}</pre>
        </details>
      </div>
    </section>
  );
}
