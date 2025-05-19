'use client';
import { auth, db } from '../lib/firebase';
import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';

export default function UpdateStoreButton() {
  const [status, setStatus] = useState('');

  const handleUpdate = async () => {
    const user = auth.currentUser;

    if (!user) {
      setStatus('❌ User not authenticated');
      return;
    }

    try {
      const storeRef = doc(db, 'StoreInfo', 'yourStoreId'); // Replace with your actual document ID
      await updateDoc(storeRef, { name: 'New Store Name' });
      setStatus('✅ Store updated successfully');
    } catch (err) {
      console.error(err);
      setStatus('❌ Update failed');
    }
  };

  return (
    <div>
      <button onClick={handleUpdate}>Update Store Info</button>
      <p>{status}</p>
    </div>
  );
}
