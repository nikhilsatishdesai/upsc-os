"use client";

import * as React from "react";
import { Download, Upload, Trash2 } from "lucide-react";

import {
  exportStateToJSON,
  parseExportedState,
  useAppStore,
  type ExportedState,
} from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DataSettings() {
  const importState = useAppStore((state) => state.importState);
  const resetAll = useAppStore((state) => state.resetAll);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = React.useState<ExportedState | null>(null);
  const [importError, setImportError] = React.useState<string | null>(null);
  const [confirmReset, setConfirmReset] = React.useState(false);

  const handleExport = () => {
    const json = exportStateToJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `upsc-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChosen = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const text = await file.text();
    const result = parseExportedState(text);
    if (result.ok) {
      setImportError(null);
      setPendingImport(result.data);
    } else {
      setImportError(result.error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your data</CardTitle>
        <CardDescription>
          Everything is stored in this browser. Download a backup regularly —
          especially before clearing browser data or switching devices.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download /> Export backup
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload /> Import backup
          </Button>
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirmReset(true)}
          >
            <Trash2 /> Reset all data
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleFileChosen}
        />
        {importError && (
          <p role="alert" className="text-sm text-destructive">
            {importError}
          </p>
        )}
      </CardContent>

      <Dialog
        open={pendingImport !== null}
        onOpenChange={(open) => !open && setPendingImport(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import this backup?</DialogTitle>
            <DialogDescription>
              {pendingImport && (
                <>
                  Backup from{" "}
                  {new Date(pendingImport.exportedAt).toLocaleDateString(
                    "en-IN",
                    { day: "numeric", month: "long", year: "numeric" },
                  )}{" "}
                  with {Object.keys(pendingImport.topics).length} tracked
                  topics. This replaces everything currently stored in this
                  browser.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingImport(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (pendingImport) importState(pendingImport);
                setPendingImport(null);
              }}
            >
              Replace my data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset all data?</DialogTitle>
            <DialogDescription>
              This permanently erases your progress, profile and recent
              topics from this browser. Consider exporting a backup first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetAll();
                setConfirmReset(false);
              }}
            >
              Erase everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
