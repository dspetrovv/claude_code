import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import EventLoopPage from './pages/EventLoopPage';
import './App.css';

export default function App() {
  return (
    <Layout>
      {({ onSectionVisible }) => (
        <Routes>
          <Route
            path="/"
            element={<EventLoopPage onSectionVisible={onSectionVisible} />}
          />
        </Routes>
      )}
    </Layout>
  );
}
