// orderContext.js
import React, { createContext, useState, useContext } from 'react';

const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const [orderItems, setOrderItems] = useState([]);

  const addToOrder = (newItem) => {
    setOrderItems(prev => {
      const existingItem = prev.find(item => item.id === newItem.id); // So sánh số với số
      if (existingItem) {
        return prev.map(item => 
          item.id === newItem.id
            ? { ...item, quantity: item.quantity + newItem.quantity }
            : item
        );
      }
      return [...prev, newItem];
    });
  };

  const updateItemQuantity = (id, newQuantity) => {
    setOrderItems(prev => 
      prev.map(item => 
        item.id === id 
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const removeItemFromOrder = (id) => {
    setOrderItems(prev => prev.filter(item => item.id !== id));
  };

  const clearOrder = () => {
  setOrderItems([]);
  };

  return (
    <OrderContext.Provider value={{ 
      orderItems, 
      addToOrder,
      updateItemQuantity,
      removeItemFromOrder,
      clearOrder 
    }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => useContext(OrderContext);