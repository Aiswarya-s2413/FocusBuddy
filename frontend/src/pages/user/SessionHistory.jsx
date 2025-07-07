import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Clock, Users, Calendar, Timer, Play, Pause, CheckCircle, XCircle } from 'lucide-react';
import PomodoroHistoryTable from '../../components/history/PomodoroHistoryTable';
import FocusBuddyHistoryTable from '../../components/history/FocusBuddyHistoryTable';

const SessionHistory = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Header Section */}
      <div className="bg-white/70 backdrop-blur-xl border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-indigo-700 bg-clip-text text-transparent">
                Session History
              </h1>
              <p className="text-slate-600 font-medium">Track your productivity sessions and focus buddy activities</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <Tabs defaultValue="pomodoro" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto bg-white/90 backdrop-blur-sm shadow-lg rounded-xl p-1">
            <TabsTrigger 
              value="pomodoro" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-orange-500 data-[state=active]:text-white"
            >
              <Timer className="h-4 w-4" />
              Pomodoro Sessions
            </TabsTrigger>
            <TabsTrigger 
              value="focus-buddy" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white"
            >
              <Users className="h-4 w-4" />
              Focus Buddy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pomodoro" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <Timer className="h-5 w-5 text-white" />
                  </div>
                  Pomodoro Session History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PomodoroHistoryTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="focus-buddy" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  Focus Buddy Session History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FocusBuddyHistoryTable />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SessionHistory;
