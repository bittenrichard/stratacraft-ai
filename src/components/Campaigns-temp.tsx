import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetaCampaigns } from './MetaCampaigns';

const Campaigns = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Campanhas</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Campanhas do Meta Ads</CardTitle>
        </CardHeader>
        <CardContent>
          <MetaCampaigns />
        </CardContent>
      </Card>
    </div>
  );
};

export default Campaigns;
