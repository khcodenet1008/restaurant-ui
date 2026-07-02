export function DeploymentPage() {
  return (
    <section className="page-section">
      <div className="section-heading">
        <h2>Deployment View</h2>
        <p>Simple explanation page for students who are testing the microservices assignment.</p>
      </div>

      <div className="deployment-grid">
        <div className="panel">
          <h3>Local / Development</h3>
          <div className="flow-line">Developer → GitHub → GitHub Actions → Docker Image</div>
          <p className="muted-text">
            The application code is built first, then images are prepared for deployment.
          </p>
        </div>

        <div className="panel">
          <h3>Production / Deployment</h3>
          <div className="flow-line">Docker Image → restaurant-gitops → Kubernetes → Services</div>
          <p className="muted-text">
            GitOps keeps deployment manifests versioned and easy to apply in the cluster.
          </p>
        </div>

        <div className="panel">
          <h3>Optional Istio</h3>
          <div className="flow-line">Istio Ingress Gateway → gateway-service → internal services</div>
          <p className="muted-text">
            The same four services can also be exposed through the optional Istio overlay.
          </p>
        </div>
      </div>
    </section>
  );
}
