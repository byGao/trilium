"use strict";

const tarExportService = require('../../services/export/tar');
const singleExportService = require('../../services/export/single');
const opmlExportService = require('../../services/export/opml');
const repository = require("../../services/repository");
const TaskContext = require("../../services/task_context");
const log = require("../../services/log");

async function exportBranch(req, res) {
    const {branchId, type, format, version, taskId} = req.params;
    const branch = await repository.getBranch(branchId);

    const taskContext = new TaskContext(taskId, 'export');

    try {
        if (type === 'subtree' && (format === 'html' || format === 'markdown')) {
            await tarExportService.exportToTar(taskContext, branch, format, res);
        }
        else if (type === 'single') {
            await singleExportService.exportSingleNote(taskContext, branch, format, res);
        }
        else if (format === 'opml') {
            await opmlExportService.exportToOpml(taskContext, branch, version, res);
        }
        else {
            return [404, "Unrecognized export format " + format];
        }
    }
    catch (e) {
        const message = "Export failed with following error: '" + e.message + "'. More details might be in the logs.";
        taskContext.reportError(message);

        log.error(message + e.stack);

        res.status(500).send(message);
    }
}

module.exports = {
    exportBranch
};