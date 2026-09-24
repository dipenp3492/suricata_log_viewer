$(document).ready(function() {
    var state = {

        records: [],

        errors: []

    };

    loadDefaultFile();

    // =========================================
    // File Upload
    // =========================================

    $("#fileInput").change(function() {

        var file = this.files[0];

        if (!file) {
            return;
        }

        var reader = new FileReader();

        reader.onload = function(event) {
            processLog(event.target.result, file.name);
        };

        reader.onerror = function() {
            $("#status").text("Unable to read the selected file.");
        };

        reader.readAsText(file);
    });


    // =========================================
    // Filter and Search
    // =========================================

    $("#eventFilter").change(function() {
        renderLogTable();
    });


    $("#searchInput").on("input", function() {
        renderLogTable();
    });


    $("#sortOrder").change(function() {
        renderLogTable();
    });


    // =========================================
    // Read and Reset Buttons
    // =========================================

    $("#resetBtn").click(function() {
        $("#eventFilter").val("all");
        $("#searchInput").val("");
        $("#sortOrder").val("desc");
        renderLogTable();
    });


    // =========================================
    // Load Default File
    // =========================================

    function loadDefaultFile() {

        $.ajax({
            url: "data/eve-sample.jsonl",
            method: "GET",
            dataType: "text",
            cache: false,
            success: function(text) {
                processLog(text, "eve-sample.jsonl");
            },
            error: function() {
                $("#status").html(
                    "<span class='status-indicator'></span>" +
                    "Default file not found. " +
                    "Please load an EVE JSONL file."
                );
            }
        });
    }


    // =========================================
    // Process Log File
    // =========================================

    function processLog(text, fileName) {

        var result = parseJSONL(text);

        state.records = result.records;

        state.errors = result.errors;

        createEventFilter();

        renderLogTable();

        $("#status").empty();

        $("<span>").addClass("status-indicator").appendTo("#status");

        $("<strong>").text(fileName).appendTo("#status");

        $("#status").append(
            " loaded • " + state.records.length + " valid events • " + state.errors.length +" skipped records"
        );
    }

    function parseJSONL(text) {

        var records = [];
        var errors = [];
        var lines = text.split(/\r?\n/);

        $.each(lines, function(index, line) {

            if (!line.trim()) {
                return;
            }

            try {
                records.push({
                    data: JSON.parse(line),
                    lineNumber: index + 1
                });

            } catch (error) {
                errors.push({
                    lineNumber: index + 1,
                    line: line,
                    message: error.message
                });

            }

        });

        return {
            records: records,
            errors: errors
        };

    }


    // =========================================
    // Create event filter
    // =========================================

    function createEventFilter() {

        var typeSet = new Set();

        for (var i = 0; i < state.records.length; i++) {
            var type = state.records[i].data.event_type;
            if (type) {
                typeSet.add(type);
            }
        }

        var uniqueTypes = Array.from(typeSet);

        uniqueTypes.sort();

        $("#eventFilter").empty();

        $("<option>").val("all").text("All Events").appendTo("#eventFilter");

        for (var j = 0; j < uniqueTypes.length; j++) {
            $("<option>").val(uniqueTypes[j]).text(uniqueTypes[j]).appendTo("#eventFilter");
        }

    }

    // =========================================
    // Get filtered records based on event type and search input
    // =========================================

    function recordMatchesFilters(record, type, search) {

        var matchesType = type === "all" || record.data.event_type === type;
        var matchesSearch = !search || JSON.stringify(record.data).toLowerCase().indexOf(search) !== -1;

        return matchesType && matchesSearch;
    }

    function getFilteredRecords() {

        var type = $("#eventFilter").val();
        var search = $("#searchInput").val().toLowerCase().trim();
        var filtered = [];

        for (var i = 0; i < state.records.length; i++) {
            if (recordMatchesFilters(state.records[i], type, search)) {
                filtered.push(state.records[i]);
            }
        }

        return filtered;
    }

    // =========================================
    // Render Log Table
    // =========================================

    function renderLogTable() {

        var records = getFilteredRecords();
        var order = $("#sortOrder").val();

        records.sort(function(a, b) {

            var timeA = getTimestamp(a.data.timestamp);
            var timeB = getTimestamp(b.data.timestamp);

            if (order === "asc") {
                return timeA - timeB;
            }

            return timeB - timeA;

        });

        $("#logList").empty();

        for (var i = 0; i < records.length; i++) {
            $("#logList").append(createEventCard(records[i]));
        }

        if (records.length === 0) {
            $("#logList").html('<div class="empty">' + '<strong>No events found.</strong>' + '<br>' + 'Try changing the filter or search text.' + '</div>');
        }

        $("#parseErrorList").empty();


        if (state.errors.length > 0) {

            for (var j = 0; j < state.errors.length; j++) {
                $("#parseErrorList").append(createErrorCard(state.errors[j]));
            }

            $("#parseErrorsSection").show();

        } else {
            $("#parseErrorsSection").hide();
        }

        updateCounters(records.length);

    }


    // =========================================
    // Update Counters
    // =========================================

    function updateCounters(visibleCount) {

        var alerts = state.records.filter(function(record) {
            return record.data.event_type === "alert";
        });

        $("#totalCount").text(state.records.length);
        $("#visibleCount").text(visibleCount);
        $("#alertCount").text(alerts.length);
        $("#errorCount").text(state.errors.length);
        $("#parseErrorBadge").text(state.errors.length);

        var eventWord = visibleCount === 1 ? "event" : "events";
        $("#resultLabel").text(visibleCount + " " + eventWord);
    }

    // =========================================
    // Create Event Card
    // =========================================

    function createEventCard(record) {

        var data = record.data;
        var card = $("#eventTemplate").clone().removeAttr("id").removeClass("template");
        var severity = getSeverity(data);
        var eventType = data.event_type || "unknown";

        card.attr("data-event-type",eventType);

        card.find(".event-badge").text(eventType);

        card.find(".event-icon").text(getEventIcon(eventType));

        if (severity) {
            card.addClass("severity-" +severity.className);
            card.find(".severity-badge").text(severity.label);
        }

        card.find(".timestamp").text(formatTimestamp(data.timestamp));

        card.find(".event-summary-small").text(getEventDescription(eventType));

        card.find(".summary").text(getSummary(data));

        card.find(".source").text(formatEndpoint(data.src_ip, data.src_port));

        card.find(".destination").text(formatEndpoint(data.dest_ip,data.dest_port));

        card.find(".protocol").text(data.proto || "—");

        var meta = card.find(".meta-row");

        appendMetaChip(meta, "Line " + record.lineNumber);

        if (data.flow_id) {
            appendMetaChip(meta, "Flow " + data.flow_id);
        }


        if (data.in_iface) {
            appendMetaChip(meta, "Interface: " + data.in_iface);
        }

        if (data.alert && data.alert.action) {
            appendMetaChip(meta, "Action: " + data.alert.action);
        }

        if (data.app_proto) {
            appendMetaChip(meta, "App: " + data.app_proto);
        }

        card.find(".raw-json").text(
                JSON.stringify(data, null, 2)
            );

        return card;
    }

    // =========================================
    // Create Error Card
    // =========================================

    function createErrorCard(error) {

        var card = $("#errorTemplate").clone().removeAttr("id").removeClass("template");

        card.find(".error-line").text("Line " +error.lineNumber);

        card.find(".raw-details-inline").text(error.message + "\n\n" + error.line);

        return card;
    }


    // =========================================
    // Event Icon Mapping
    // =========================================

    function getEventIcon(type) {

        var icons = {
            alert: "!",
            dns: "D",
            http: "H",
            flow: "F",
            fileinfo: "F",
            ssh: "S",
            anomaly: "A",
            stats: "S",
            tls: "T"
        };

        return icons[type] || "E";
    }


    // =========================================
    // Get Event Description
    // =========================================

    function getEventDescription(type) {

        var descriptions = {
            alert: "Security detection",
            dns: "DNS network activity",
            http: "HTTP network activity",
            flow: "Network flow",
            fileinfo: "File information",
            ssh: "SSH connection",
            anomaly: "Application anomaly",
            stats: "Statistics event",
            tls: "TLS network activity"
        };

        return ( descriptions[type] || "Network security event");

    }

    // =========================================
    // Get Summary for Event Types
    // =========================================

    function getSummary(data) {

        switch (data.event_type) {

            case "alert":
                return getAlertSummary(data);
            case "dns":
                return getDNSSummary(data);
            case "http":
                return getHTTPSummary(data);
            case "flow":
                return getFlowSummary(data);
            case "fileinfo":
                return getFileSummary(data);
            case "ssh":
                return "SSH connection";
            case "anomaly":
                return getAnomalySummary(data);
            case "tls":
                return "TLS connection";
            case "stats":
                return "Suricata statistics event";
            default:

                return (data.event_type || "Unknown") + " network event";

        }

    }


    // =========================================
    // get alert summary
    // =========================================

    function getAlertSummary(data) {

        var alert = data.alert || {};
        var signature = alert.signature || "Security alert";

        if (alert.severity) {
            return (signature + " (severity " + alert.severity + ")");
        }

        return signature;
    }


    // =========================================
    // get dns summary
    // =========================================

    function getDNSSummary(data) {

        var dns =  data.dns || {};

        return ("DNS " + (dns.type || "event") + " for " + (dns.rrname || "unknown domain"));
    }


    // =========================================
    // get http summary
    // =========================================

    function getHTTPSummary(data) {

        var http = data.http || {};

        return ((http.http_method || "HTTP") + " request to " + (http.hostname || "unknown host") + (http.url || "/"));
    }


    // =========================================
    // get flow summary
    // =========================================

    function getFlowSummary(data) {

        var flow = data.flow || {};
        var packets = "";

        if (flow.pkts_toserver != null && flow.pkts_toclient != null) {
            packets = " - " + (flow.pkts_toserver + flow.pkts_toclient ) + " packets";
        }

        return ("Network flow" + packets);
    }


    // =========================================
    // get File Sumary
    // =========================================

    function getFileSummary(data) {

        var file = data.fileinfo || {};

        return ("File transfer: " + (file.filename || "file"));
    }


    // =========================================
    // get anomaly summary
    // =========================================

    function getAnomalySummary(data) {

        var anomaly =
            data.anomaly || {};


        return (
            "Application anomaly: " +
            (
                anomaly.event ||
                "Unknown"
            )
        );

    }


    // =========================================
    // get Severity
    // =========================================

    function getSeverity(data) {

        var severity = Number(data.alert && data.alert.severity);

        if (!severity) {
            return null;
        }

        var names = {
            1: "HIGH",
            2: "MEDIUM",
            3: "LOW"
        };

        var className = "low";


        if (severity === 1) {
            className = "high";
        }

        if (severity === 2) {
            className = "medium";
        }

        return {
            className: className,
            label: ( names[severity] ||  "SEVERITY") + " " + severity
        };

    }


    // =========================================
    // FORMAT ENDPOINT
    // =========================================

    function formatEndpoint(ip, port) {

        if (!ip) {
            return "-";
        }

        var address;

        if (ip.indexOf(":") !== -1) {
            address = "[" + ip + "]";
        } else {
            address = ip;
        }

        if (port) {
            return (address + ":" + port);
        }

        return address;

    }


    // =========================================
    // Get Timestamp
    // =========================================

    function getTimestamp(value) {

        var number = Number(value);


        if (!isFinite(number)) {
            return 0;
        }

        if (number < 1000000000000) {
            return number * 1000;
        }

        return number;
    }

    // =========================================
    // Format Timestamp for Display
    // =========================================

    function formatTimestamp(value) {

        var timestamp = getTimestamp(value);


        if (!timestamp) {
            return "Unknown timestamp";
        }

        var date = new Date(timestamp);

        if (isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleString();
    }


    // =========================================
    // Add meta chip to event card
    // =========================================

    function appendMetaChip(parent, text) {
        $("<span>").addClass("meta-chip").text(text).appendTo(parent);
    }

});