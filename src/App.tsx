import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnalysisProvider } from './contexts/AnalysisContext';
import { IndicatorProvider } from './contexts/IndicatorContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import ProductAnalysis from './pages/ProductAnalysis';
import ProvinceAnalysis from './pages/ProvinceAnalysis';
import StrategyPlanning from './pages/StrategyPlanning';
import IndicatorPlanning from './pages/IndicatorPlanning';

function App() {
  return (
    <AnalysisProvider>
      <IndicatorProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/product-analysis" element={<ProductAnalysis />} />
              <Route path="/province-analysis" element={<ProvinceAnalysis />} />
              <Route path="/strategy-planning" element={<StrategyPlanning />} />
              <Route path="/indicator-planning" element={<IndicatorPlanning />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Router>
      </IndicatorProvider>
    </AnalysisProvider>
  );
}

export default App;

