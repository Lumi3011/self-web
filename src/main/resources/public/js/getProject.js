$(document).ready(
    function () {
        getProject();
    }
);

function getProject() {
    var owner =$("#owner").text();
    var name =$("#name").text();
    $("#loadingProject").show();
    $.get(
        "/api/users/self",
        function(user) {
            console.log(user);
            $.get(
                "/api/projects/"+owner+"/"+name,
                function(project) {
                    $("#loadingProject").hide();
                    if(project === undefined) {
                        $(".project-not-registered").show();
                    } else {
                        displayProject(user.login, project);
                        $(".badge-project-url").text(
                            "https://self-xdsd.com/p/" + owner + "/" + name
                            + "?provider=" + project.provider
                        )
                    }
                }
            );
        }
    );
}

function displayProject(userLogin, project) {
    console.log(project);
    $(".managedByLink").html(
        $('<a></a>')
            .attr("href","https://github.com/" + project.manager.username)
            .attr("target", "_blank")
            .html("@" + project.manager.username)
    );
    $(".managedBy").html("@" + project.manager.username);
    $("#projectOverview").addClass("show");
    if(project.selfOwner == userLogin) {
        $("#ownerCard").hide();
        walletAsPieChart(project.wallet);
    } else {
        $("#ownerCard .selfOwner").html(project.selfOwner);
        $("#walletCard").hide();
        $(".project-owner-buttons").hide();
    }
    $(".project-buttons").show();
}

/**
 * Attaches cash limit form popover to an element.
 * Also takes care of the cash limit logic.
 * @param {$} anchor DOM element of which popover is attached.
 * @param {$} currentLimit DOM element holding Wallet's current cash limit.
 * @param {String} walletType Wallet type. (ex: STRIPE)
 * @param {Function} onLimitUpdate Called when limit is successfully updated.
 * @callback onLimitUpdate Callback having Wallet updated with new limit.
 */
function installUpdateCashLimitPopover(anchor, currentLimit, walletType, onLimitUpdate) {
    if (anchor.data("installed") || false) {
        return;
    }
    anchor.data("installed", true);

    //updating states:
    var IDLE = 0;
    var UPDATING = 1;
    var ERROR = 2;

    //template
    var form = $(
        '<div><form>'+
            '<div class="form-row">'+
                '<div class="col">'+
                    '<div class="input-group-sm d-flex">'+
                        '<div class="input-group-prepend">'+
                            '<span class="input-group-text">€</span>'+
                        '</div>'+
                        '<input type="number" class="form-control" id="updateCashInput" placeholder="Limit" required>'+
                    '</div>'+
                '</div>'+
                '<div class="col-auto p-0">'+
                    '<button type="submit" class="ml-1 btn-sm btn-primary" id="updateCashSubmit">'+
                        '<i class="fa fa-refresh"/>'+
                    '</button>'+
                '</div>'+
            '</div>'+
            '<div class="form-row" id="updateCashFormError" style="display:none">'+
                '<div class="col-auto">' +
                    '<small class="error text-danger"/>'+
                '</div>'+
            '</div>'
        +'</form></div>').html();
    //attach popover
    anchor.popover({
        html: true,
        content: () => form,
        title: "Update cash limit",
        sanitize: false,
        container: 'body',
        placement: 'bottom',
    });
    //on show
    anchor.on('shown.bs.popover', function () {
        anchor.data("showing", true);

        var content = $($(this).data("bs.popover").getTipElement());
        content.css("width", "220px");

        var submit = content.find("#updateCashSubmit");
        var refreshIcon = content.find("#updateCashSubmit i");

        //check updating state
        switch (anchor.data("updating") || IDLE) {
            case UPDATING: {
                refreshIcon.addClass("fa-spin");
                submit.prop("disabled", true);
                content.find("#updateCashInput").val(anchor.data("updatingValue"));
                break;
            }
            case ERROR: {
                var error = content.find("#updateCashFormError");
                error.show();
                error.find("small").text("Something went wrong, please try again!");
                content.find("#updateCashInput").val(anchor.data("updatingValue"));
                break;
            }
            default:
                content.find("#updateCashInput").val(currentLimit.text().substring(1));
        }

        submit.click((e) => {
            e.preventDefault();

            var inputValue = content.find("#updateCashInput").val();
            var error = content.find("#updateCashFormError");

            if (inputValue === "") {
                error.show();
                error.find("small").text("Cash limit must not be empty!");
            } else if (parseFloat(inputValue) <= 0) {
                error.show();
                error.find("small").text("Cash limit must be positive!");
            } else if (inputValue === currentLimit.text().substring(1)) {
                error.show();
                error.find("small").text("Cash limit $" + inputValue + " is already set!");
            } else {
                error.hide();
                //updating state
                anchor.data("updating", UPDATING);
                anchor.data("updatingValue", inputValue);
                //UPDATING state visual
                refreshIcon.addClass("fa-spin");
                submit.prop("disabled", true);

                var owner = $("#owner").text();
                var name = $("#name").text();
                $.ajax({
                    type: 'PUT',
                    url: '/api/projects/' + owner + '/' + name + '/wallets/' + walletType,
                    contentType: 'application/json',
                    data: inputValue,
                }).done(wallet => {

                    var isPopoverVisible = anchor.data("showing") || false;
                    if (isPopoverVisible) {
                        content.find("#updateCashInput").val(wallet.cash);
                        var currentLimitLen = currentLimit.text().length - 1; // ignore $ sign
                        //reposition if new limit.text length is different than current.
                        //this way the popover it will always be relative to its anchor.
                        if (currentLimitLen !== inputValue.length) {
                            anchor.popover('show');
                        }
                    }
                    onLimitUpdate(wallet);
                    anchor.data("updating", IDLE);
                }).fail(() => {
                    var isPopoverVisible = anchor.data("showing") || false;
                    if (isPopoverVisible) {
                        var error = content.find("#updateCashFormError");
                        error.show();
                        error.find("small").text("Something went wrong, please try again!");
                    }
                    anchor.data("updating", ERROR);
                }).always(() => {
                    var isPopoverVisible = anchor.data("showing") || false;
                    if (isPopoverVisible) {
                        content.find("#updateCashSubmit i").removeClass("fa-spin");
                        content.find("#updateCashSubmit").prop("disabled", false);
                    }
                });
            }
        });
    });
    //on hide
    anchor.on('hidden.bs.popover', function () {
        anchor.data("showing", false);
    });
}
