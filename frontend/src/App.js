import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TradeView } from './pages/TradeView';
function App() {
    return (<BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/trade" replace/>}/>
        <Route path="/trade" element={<TradeView />}/>
      </Routes>
    </BrowserRouter>);
}
export default App;
