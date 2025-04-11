"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, Plus } from "lucide-react";
import React, { useEffect } from "react";
import { Incentive, useContestForm } from "./ContestFormContext";
import { format } from "date-fns";
import { CriteriaType } from "@/types/prizes-timeline";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const GMVPrizeTimeline = () => {
	const { formData, updatePrizeTimelineData, updateIncentivesData } = useContestForm();
  const { startDate, endDate, criteria } = formData.prizeTimeline;
  const incentives = formData.incentives || [];

  // Initialize incentives if they don't exist
  useEffect(() => {
    // If no incentives exist, create default ones
    if (!incentives.length) {
      updateIncentivesData([
        { name: '', worth: 0, description: '' },
        { name: '', worth: 0, description: '' }
      ]);
    }
  }, [incentives.length, updateIncentivesData]);

  const handleIncentiveChange = (index: number, field: keyof Incentive, value: string | number) => {
    const updatedIncentives = [...incentives];
    
    // Ensure the incentive exists
    if (!updatedIncentives[index]) {
      updatedIncentives[index] = { name: '', worth: 0, description: '' };
    }
    
    // Create a copy of the current incentive to avoid direct mutation
    const updatedIncentive = { ...updatedIncentives[index] };
    
    // Handle different field types appropriately
    if (field === 'name') {
      updatedIncentive.name = value as string;
    } 
    else if (field === 'description') {
      updatedIncentive.description = value as string;
    }
    else if (field === 'worth') {
      // Handle worth field - convert string to number if needed
      if (typeof value === 'string') {
        // Extract numeric value from milestone (e.g. "$5,000 GMV" -> 5000)
        const numericValue = parseInt(value.replace(/[^0-9]/g, ''));
        updatedIncentive.worth = isNaN(numericValue) ? 0 : numericValue;
      } else {
        updatedIncentive.worth = value;
      }
    }
    
    // Update the incentive at the correct index
    updatedIncentives[index] = updatedIncentive;
    
    // Update the entire incentives array
    updateIncentivesData(updatedIncentives);
  };
  
  // Add new incentive handler
  const handleAddIncentive = () => {
    const updatedIncentives = [...incentives];
    updatedIncentives.push({ name: '', worth: 0, description: '' });
    updateIncentivesData(updatedIncentives);
  };
		
  const handleStartDateChange = (date: Date | undefined) => {
    updatePrizeTimelineData({ startDate: date });
  };

  const handleEndDateChange = (date: Date | undefined) => {
    updatePrizeTimelineData({ endDate: date });
  };

  const handleCriteriaChange = (value: string) => {
    updatePrizeTimelineData({ criteria: value as CriteriaType });
  };

  return (
    <div className="max-w-[44rem] mx-auto ">
      <div className="space-y-6">
        {/* Contest Duration*/}
        <div className="bg-white border border-[#FFBF9B] rounded-xl p-6">
          <h2 className="text-lg font-medium mb-4">Contest Duration</h2>
          <div className="flex flex-col gap-5">
            <div className="space-x-10 flex">
              <div>
                <Label>Contest Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full mt-2 justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? (
                        format(startDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 bg-[#f7f7f7]"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={handleStartDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Contest End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full mt-2 justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? (
                        format(endDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 bg-[#f7f7f7]"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={handleEndDateChange}
                      initialFocus
                      disabled={(date) =>
                        startDate ? date < startDate : false
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-x-4 flex">
              <div>
                <div className="flex gap-2">
                  <Label className="text-base">Leaderboard Criteria</Label>
                  <p className="text-sm text-gray-500 mt-1 italic">
                    (Choose how winners will be ranked)
                  </p>
                </div>

                <RadioGroup
                  className="flex gap-3 mt-2"
                  value={criteria}
                  onValueChange={handleCriteriaChange}
                >
                  <div
                    className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
                    data-state={
                      criteria === "gmv-sales" ? "checked" : "unchecked"
                    }
                  >
                    <RadioGroupItem value="gmv-sales" id="gmv-sales" />
                    <Label htmlFor="gmv-sales">GMV Sales</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        </div>

        {/* Incentives */}
        <div className="bg-white border border-[#FFBF9B] rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Incentives</h2>
            <Button 
              onClick={handleAddIncentive}
              className="bg-[#FD5C02] hover:bg-[#e54e00] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Incentive
            </Button>
          </div>
          
          {incentives.map((incentive, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <div className="bg-[#66708566] h-0.5 mt-2 mb-2 w-[90%] mx-auto" />
              )}
              <Card className="shadow-none border-none">
                <CardHeader className="relative pb-2">
                  <span className="absolute top-2 right-2 text-orange-500 font-normal">
                    Incentive #{index + 1}
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`incentive-name-${index + 1}`} className="text-base mb-1">
                        Incentive Name
                      </Label>
                      <Input
                        id={`incentive-name-${index + 1}`}
                        placeholder="Miami Trip for 2"
                        className="mt-1"
                        value={incentive?.name || ''}
                        onChange={(e) => handleIncentiveChange(index, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`milestone-${index + 1}`} className="text-base mb-1">
                        Milestone to Qualify
                      </Label>
                      <Input
                        id={`milestone-${index + 1}`}
                        placeholder="$5,000 GMV"
                        className="mt-1"
                        value={incentive?.worth ? `${incentive.worth}` : ''}
                        onChange={(e) => handleIncentiveChange(index, 'worth', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor={`incentive-desc-${index + 1}`} className="text-base mb-1">
                      List and Describe your Incentives
                    </Label>
                    <Textarea
                      id={`incentive-desc-${index + 1}`}
                      rows={5}
                      placeholder={`• Includes flight and 3-night stay in a luxury resort\n• Gift Cards\n• Apple Ipad`}
                      className="mt-1"
                      value={incentive?.description || ''}
                      onChange={(e) => handleIncentiveChange(index, 'description', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GMVPrizeTimeline;