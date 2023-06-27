import {MD_CONST} from "./const.mjs";

export const canvasWrapping = () =>{
    libWrapper.register(MD_CONST.MODULE_ID,
        "Canvas.prototype._onDrop",
        onCanvasDrop,
        "MIXED")
};

async function onCanvasDrop(wrapper, ...args) {
    const data = JSON.parse(args[0].dataTransfer.getData('text/plain'));

    if(data?.type === 'Actor') {
        console.log(data);

        const actor = await fromUuid(data.uuid);

        if(actor) {
            if(actor.prototypeToken.actorLink) {
                wrapper(...args);
                return;
            }

            const noOfCopies = await numberOfCopiesDialog(actor);

            await _handleDropActors({event: args[0], actor, noOfCopies});
        }
    }
    else {
        wrapper(...args);
    }
}

function numberOfCopiesDialog(actor) {
    return new Promise((resolve, reject) => {
        const dialog = new Dialog({
            title: game.i18n.localize("md.no-of-copies-title"),
            content: `<form class="md-dialog">
                        <h1>${game.i18n.localize("md.actor-to-create")}: ${actor.name}</h1>
                        <label for="noOfCopies">${game.i18n.localize("md.how-many")}</label>
                        <input type="number" name="noOfCopies" value="1">
                      </form>`,
            buttons: {
                create: {
                    label: game.i18n.localize("md.create"),
                    icon: "<i class=\"fa-solid fa-user-plus\"></i>",
                    callback: (html) => {
                        const formElement = html[0].querySelector("form");
                        const formData = new FormDataExtended(formElement);

                        console.log(formData)

                        resolve(formData.object.noOfCopies);
                    }
                }
            },
            close: () => {reject()}
        });

        dialog.render(true);
    });
}

async function _handleDropActors({event, actor, noOfCopies}) {
    const topLeft = _translateToTopLeftGrid(event);
    const xPosition = topLeft[0];
    const yPosition = topLeft[1];

    if(noOfCopies < 1)
        return;

    let distance = 0;
    let offsetX = 0;
    let offsetY = 0;

    for(let dropped = 0; dropped < noOfCopies; dropped++) {
        if (dropped === Math.pow(1 + distance * 2, 2)) {
            distance += 1;
            offsetX = -1 * distance * canvas.grid.w;
            offsetY = -1 * distance * canvas.grid.h;
        }

        const totalTries =
            Math.pow(1 + distance * 2, 2) - Math.pow(distance * 2 - 1, 2);

        const tries =  Math.pow(1 + distance * 2, 2) - dropped;

        await _dropActor({
            actor,
            xPosition: xPosition + offsetX,
            yPosition: yPosition + offsetY
        });

        if (totalTries - tries < totalTries / 4) {
            offsetX += canvas.grid.w;
        } else if (totalTries - tries < (2 * totalTries) / 4) {
            offsetY += canvas.grid.h;
        } else if (totalTries - tries < (3 * totalTries) / 4) {
            offsetX -= canvas.grid.w;
        } else {
            offsetY -= canvas.grid.h;
        }
    }
}

async function _dropActor({ actor, xPosition, yPosition, isHidden, elevation }) {
    const tokenDocument = await actor.getTokenDocument({
        x: xPosition,
        y: yPosition,
        hidden: isHidden,
        elevation: isNaN(elevation) ? 0 : elevation,
    });

    return tokenDocument.constructor.create(tokenDocument, {
        parent: canvas.scene,
    });
}

function _translateToTopLeftGrid(event) {
    const transform = canvas.tokens.worldTransform;
    const tx = (event.clientX - transform.tx) / canvas.stage.scale.x;
    const ty = (event.clientY - transform.ty) / canvas.stage.scale.y;

    return canvas.grid.getTopLeft(tx, ty);
}

