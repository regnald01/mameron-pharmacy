import { BrowserRouter, Routes, Route } from'react-router-dom';
import  Home from './pages/Home'
import Medicines from "./components/Medicine";
import Dashboard from './components/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />}>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={""} />
          <Route path="products" element={""} />
          <Route path="Sales" element={<Medicines />}></Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
